"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    User,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from "firebase/auth";
import { auth } from "@/utils/firebase";
import { detachDeviceToken } from "@/utils/notifications";

// ログアウト時の通知トークン切り離しを待つ上限。これを超えたらログアウトを優先する
const DETACH_TIMEOUT_MS = 5000;

// アプリ全体で認証状態を共有するためのContext型定義
interface AuthContextType {
    user: User | null;     // ログイン中のユーザー（未ログインはnull）
    loading: boolean;      // Firebase認証の初期チェックが完了したかどうか
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

// デフォルト値: loading=true にしておくことでちらつきを防ぐ
const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInWithGoogle: async () => { },
    signOut: async () => { },
});

// 各コンポーネントから認証状態を取り出すためのショートカット
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Firebase がローカルの認証トークンを検証し、状態が確定したら呼ばれる
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        // コンポーネントアンマウント時にリスナーを解除してメモリリークを防ぐ
        return () => unsubscribe();
    }, []);

    // Googleのポップアップ画面でログインする
    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const signOut = async () => {
        // ログアウト後にこの端末へリマインダーが届かないよう、認証が有効なうちに通知トークンを切り離す。
        // 失敗してもログアウト自体は止めない（トークンが残っても送信時の自動クリーンアップで回収される）。
        // オフラインだと Firestore の書き込みはサーバー応答まで resolve しないため、時間で打ち切る
        if (auth.currentUser) {
            try {
                await Promise.race([
                    detachDeviceToken(auth.currentUser.uid),
                    new Promise<void>((_, reject) =>
                        setTimeout(() => reject(new Error("timeout")), DETACH_TIMEOUT_MS)
                    ),
                ]);
            } catch (error) {
                console.error("Failed to detach notification token", error);
            }
        }
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Logout failed", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
