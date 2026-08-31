import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { adminDb, adminMessaging } from "@/utils/firebase-admin";
import { getTodayStartJST } from "@/utils/date";
import { ICON_PATH } from "@/constants/icon";

// 通知テンプレート（固定）
const NOTIFICATION_TITLE = "今日のこころの記録をしましょう";
const NOTIFICATION_BODY = "今日はまだワークシートの記録がありません。気持ちを振り返る時間を作りましょう 💙";

// タイミング攻撃を避けるため CRON_SECRET は定数時間で比較する
function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    // timingSafeEqual は長さが違うと例外を投げるため事前に弾く
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

// Vercel Cron はビルド時ではなく毎回実行させる必要がある（認証ヘッダーの検証があるため）
export const dynamic = "force-dynamic";
// ユーザー数×（Firestore クエリ + FCM 送信）で既定の関数タイムアウトでは不安なため余裕を持たせる
// （60s は Hobby プランの上限内）
export const maxDuration = 60;

async function handleSend(req: NextRequest) {
    // CRON_SECRET でクロンジョブ以外からのアクセスを弾く。
    // Vercel Cron は環境変数 CRON_SECRET を Authorization: Bearer ヘッダーとして自動付与する
    const authHeader = req.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || !authHeader || !safeEqual(authHeader, `Bearer ${cronSecret}`)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // entries.createdAt は JST の datetime-local 形式（YYYY-MM-DDTHH:MM）で保存されているため、
        // 同じ形式の「今日の開始時刻」と文字列比較して JST 日付の境界を判定する
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
        let failed = 0;
        const invalidTokens: string[] = [];

        await Promise.all(
            settingsSnap.docs.map(async (settingsDoc) => {
                const userId = settingsDoc.id;
                // 1ユーザーの処理失敗が Promise.all 全体を巻き込まないよう個別に握りつぶす
                try {
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
                    await adminMessaging.send({
                        token: fcmToken,
                        notification: {
                            title: NOTIFICATION_TITLE,
                            body: NOTIFICATION_BODY,
                        },
                        webpush: {
                            notification: {
                                // Service Worker はこのペイロードの icon を読んで表示するため、
                                // ここが通知アイコンの実質的な参照元になる
                                icon: ICON_PATH,
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
                        failed++;
                        console.error(`Failed to process notification for user ${userId}:`, error);
                    }
                }
            })
        );

        // 無効なトークンをクリア（次回以降の送信コスト削減）
        if (invalidTokens.length > 0) {
            await Promise.all(
                invalidTokens.map((userId) =>
                    adminDb
                        .collection("user_settings")
                        .doc(userId)
                        .update({ fcmToken: null })
                        .catch((e) => console.error(`Failed to clear token for user ${userId}:`, e))
                )
            );
        }

        console.log(
            `Notifications: sent=${sent}, skipped=${skipped}, failed=${failed}, invalidTokensCleared=${invalidTokens.length}`
        );
        return NextResponse.json({
            sent,
            skipped,
            failed,
            invalidTokensCleared: invalidTokens.length,
        });
    } catch (error) {
        // 設定一覧の取得失敗など、ユーザー単位より外側で起きた想定外のエラー
        console.error("Notification job failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// GET: Vercel Cron の呼び出し用（Vercel Cron は GET リクエストを送る）
// POST: curl での手動実行用に残している（Bearer 認証は共通）
export { handleSend as GET, handleSend as POST };
