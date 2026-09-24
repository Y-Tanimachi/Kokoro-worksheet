import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { app } from "./firebase";
import { getUserSettings, updateUserSettings } from "./userSettings";

// FCM トークンを取得するためには NEXT_PUBLIC_FIREBASE_VAPID_KEY が必要
// Firebase コンソール > プロジェクト設定 > Cloud Messaging > ウェブプッシュ証明書 で生成する
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// 通知許可要求の結果。呼び出し側が原因別に案内を出し分けられるよう状態を区別する。
// - ok:          許可されトークンを取得できた
// - denied:      ユーザーが許可しなかった（ブラウザ設定から変更が必要）
// - unsupported: この環境が Web Push 非対応（例: iOS の非PWA Safari）
// - error:       許可はされたがトークン取得に失敗（VAPIDキー未設定・SW登録失敗など設定側の問題）
export type NotificationPermissionResult =
    | { status: "ok"; token: string }
    | { status: "denied" }
    | { status: "unsupported" }
    | { status: "error" };

// この端末（ブラウザ）の FCM トークンを取得する。通知許可が "granted" の状態で呼ぶこと。
// 自前で登録した SW を明示的に渡す。渡さないと SDK が別スコープで SW を登録し、
// deleteToken が別の登録の push 購読を解除しようとしてしまうため。
const getDeviceToken = async (): Promise<string | null> => {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
    });
    return token || null;
};

// ブラウザの通知許可を要求し、FCM トークンを取得する
export const requestNotificationPermission = async (): Promise<NotificationPermissionResult> => {
    // サービスワーカーが使えない環境（SSR等）は早期リターン
    if (typeof window === "undefined" || !("Notification" in window)) {
        return { status: "unsupported" };
    }

    const supported = await isSupported();
    if (!supported) return { status: "unsupported" };

    // 既に許可済みの場合、requestPermission() はプロンプトを出さず即座に "granted" を返す
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { status: "denied" };

    try {
        const token = await getDeviceToken();
        if (!token) return { status: "error" };
        return { status: "ok", token };
    } catch (error) {
        console.error("Failed to obtain FCM token:", error);
        return { status: "error" };
    }
};

// ログアウト時に、この端末の FCM トークンをアカウントから切り離して破棄する。
// Firestore への書き込みがあるため、ログアウト（認証解除）より前に呼ぶこと。
//
// - 先に deleteToken でトークン自体を無効化する。ログアウト後のリマインダーを止める最も確実な手段で、
//   同じ端末で別アカウントが通知を ON にしても新しいトークンが発行されるため、
//   前のアカウント宛てのリマインダーが混ざらない。
// - 続いて保存済みトークンがこの端末のものなら null に戻す（無効トークンへの無駄な送信を省く）。
//   別端末のトークンが保存されている場合は、その端末の通知を止めないよう触らない。
//   この更新が失敗・中断して古いトークンが残っても、送信時に not-registered となり
//   通知 API 側で自動クリーンアップされる。
// - notificationsEnabled は利用者の設定として残す。再ログイン時に useNotificationSettings が
//   新しいトークンを取り直して保存するため、その端末でリマインダーが再開する。
export const detachDeviceToken = async (userId: string): Promise<void> => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // 許可済みでない端末はトークンを持っていない。
    // また getToken は許可が "default" だと許可プロンプトを出してしまうため、ここで弾く。
    if (Notification.permission !== "granted") return;
    if (!(await isSupported())) return;

    const token = await getDeviceToken();
    if (!token) return;

    await deleteToken(getMessaging(app));

    const settings = await getUserSettings(userId);
    if (settings?.fcmToken === token) {
        await updateUserSettings(userId, { fcmToken: null });
    }
};
