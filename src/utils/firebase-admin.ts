// Firebase Admin SDK はサーバーサイド（API Routes）専用。秘密鍵を使うためクライアントに露出してはいけない
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// サービスアカウントの認証情報は環境変数から取得
// FIREBASE_PRIVATE_KEY は改行が "\n" リテラルで格納されるため実際の改行文字に置換する
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

// Next.js のホットリロード時に二重初期化を防ぐ
if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

// サーバーサイドで Firestore / Auth / Messaging を操作するための管理者権限インスタンス
export const adminDb = getFirestore();
export const adminAuth = getAuth();
export const adminMessaging = getMessaging();
