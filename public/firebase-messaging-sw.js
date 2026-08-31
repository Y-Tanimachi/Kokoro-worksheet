// Firebase v12 compat SDK を使用（サービスワーカーは ESM 非対応環境のため compat を使う）
importScripts("https://www.gstatic.com/firebasejs/12.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyADr1-p8l2kJfMGQiAjwYomxFoi4Ab_drI",
    authDomain: "kokoro-worksheet.firebaseapp.com",
    projectId: "kokoro-worksheet",
    storageBucket: "kokoro-worksheet.firebasestorage.app",
    messagingSenderId: "81421732991",
    appId: "1:81421732991:web:95193c6de9ad1f437e834a"
});

const messaging = firebase.messaging();

// アプリがバックグラウンド（または閉じている）のときに受信したメッセージを処理する
messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "今日のこころの記録をしましょう";
    const body = payload.notification?.body || "今日はまだワークシートの記録がありません。気持ちを振り返る時間を作りましょう 💙";

    // アイコンはサーバー（/api/notifications/send）が webpush ペイロードで送る URL を使う。
    // このファイルは src/ の定数を import できないため、ファイル名をここに書かずに
    // ペイロード経由で受け取ることで参照元を src/constants/icon.ts に集約している（issue #18）。
    // icon が無いペイロード（現運用では来ない）の場合はブラウザ既定の表示に任せる
    const icon = payload.notification?.icon || payload.data?.icon;

    self.registration.showNotification(title, {
        body,
        ...(icon ? { icon, badge: icon } : {}),
    });
});
