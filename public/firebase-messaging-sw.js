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

    // 末尾の -2 は現行アイコンのファイル名。アイコンを差し替えるときは
    // URL ごと変えないとインストール済み端末のキャッシュが更新されないため、
    // 上書きではなく連番を付けたファイルを追加する運用にしている（manifest.json も同じ名前を参照）
    self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-512-2.png",
        badge: "/icons/icon-512-2.png",
    });
});
