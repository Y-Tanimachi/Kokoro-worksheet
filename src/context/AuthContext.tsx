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
