import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { app } from "./firebase";

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
        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (!token) return { status: "error" };
        return { status: "ok", token };
    } catch (error) {
        console.error("Failed to obtain FCM token:", error);
        return { status: "error" };
    }
};
