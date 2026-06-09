import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { app } from "./firebase";

// FCM トークンを取得するためには NEXT_PUBLIC_FIREBASE_VAPID_KEY が必要
// Firebase コンソール > プロジェクト設定 > Cloud Messaging > ウェブプッシュ証明書 で生成する
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// ブラウザの通知許可を要求し、FCM トークンを返す
// 許可が拒否された場合・サポート外ブラウザの場合は null を返す
export const requestNotificationPermission = async (): Promise<string | null> => {
    // サービスワーカーが使えない環境（SSR等）は早期リターン
    if (typeof window === "undefined" || !("Notification" in window)) return null;

    const supported = await isSupported();
    if (!supported) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
    });

    return token || null;
};
