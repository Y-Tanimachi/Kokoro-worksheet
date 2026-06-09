import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/utils/firebase-admin";

// 通知テンプレート（固定）
const NOTIFICATION_TITLE = "今日のこころの記録をしましょう";
const NOTIFICATION_BODY = "今日はまだワークシートの記録がありません。気持ちを振り返る時間を作りましょう 💙";

// JST（UTC+9）における今日の開始時刻を ISO 文字列で返す
// entries の createdAt は "+09:00" オフセット付き ISO 文字列で保存されているため、
// 同じオフセットで比較することで JST 日付の境界を正しく扱える
function getTodayStartJST(): string {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const nowJST = new Date(now.getTime() + jstOffset);
    const y = nowJST.getUTCFullYear();
    const m = String(nowJST.getUTCMonth() + 1).padStart(2, "0");
    const d = String(nowJST.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}T00:00:00+09:00`;
}

export async function POST(req: NextRequest) {
    // CRON_SECRET でクロンジョブ以外からのアクセスを弾く
    const authHeader = req.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStartJST = getTodayStartJST();

    // 通知が有効で FCM トークンを持つ全ユーザーを取得
    const settingsSnap = await adminDb
        .collection("user_settings")
        .where("notificationsEnabled", "==", true)
        .get();

    if (settingsSnap.empty) {
        return NextResponse.json({ sent: 0, skipped: 0 });
    }

    let sent = 0;
    let skipped = 0;
    const invalidTokens: string[] = [];

    await Promise.all(
        settingsSnap.docs.map(async (settingsDoc) => {
            const userId = settingsDoc.id;
            const { fcmToken } = settingsDoc.data() as { fcmToken: string | null };
            if (!fcmToken) return;

            // 今日（JST）の記録が存在するか確認
            const entriesSnap = await adminDb
                .collection("users")
                .doc(userId)
                .collection("entries")
                .where("createdAt", ">=", todayStartJST)
                .limit(1)
                .get();

            if (!entriesSnap.empty) {
                // 既に記録あり → 通知不要
                skipped++;
                return;
            }

            // 記録なし → FCM 通知を送信
            try {
                await adminMessaging.send({
                    token: fcmToken,
                    notification: {
                        title: NOTIFICATION_TITLE,
                        body: NOTIFICATION_BODY,
                    },
                    webpush: {
                        notification: {
                            icon: "/icons/icon-512.png",
                        },
                    },
                });
                sent++;
            } catch (error: unknown) {
                const errCode = (error as { errorInfo?: { code?: string } })?.errorInfo?.code;
                // トークンが無効になった場合は後でクリーンアップするためリストに追加
                if (errCode === "messaging/registration-token-not-registered") {
                    invalidTokens.push(userId);
                } else {
                    console.error(`Failed to send notification to user ${userId}:`, error);
                }
            }
        })
    );

    // 無効なトークンをクリア（次回以降の送信コスト削減）
    if (invalidTokens.length > 0) {
        await Promise.all(
            invalidTokens.map((userId) =>
                adminDb.collection("user_settings").doc(userId).update({ fcmToken: null })
            )
        );
    }

    console.log(`Notifications: sent=${sent}, skipped=${skipped}, invalidTokensCleared=${invalidTokens.length}`);
    return NextResponse.json({ sent, skipped, invalidTokensCleared: invalidTokens.length });
}
