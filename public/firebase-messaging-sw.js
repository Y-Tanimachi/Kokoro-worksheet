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

// バックグラウンド受信の初期化。firebase.messaging() を呼ぶことで SDK の push ハンドラが登録される。
firebase.messaging();

// onBackgroundMessage で showNotification は呼ばない。
// サーバー（/api/notifications/send）は notification ペイロード付きで送っており、
// その場合 SDK が自動で通知を表示するため、ここでも表示すると同じ通知が2件出てしまう。
// アイコンはサーバーが webpush.notification.icon で送る URL が自動表示にも使われるので、
// 参照元は src/constants/icon.ts に集約されたまま保たれる（issue #18）。
