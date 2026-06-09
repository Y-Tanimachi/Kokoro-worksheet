"use client"

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserSettings, updateUserSettings } from "@/utils/userSettings";
import { requestNotificationPermission } from "@/utils/notifications";

export function useNotificationSettings() {
    const { user } = useAuth();
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);

    // ログイン時に Firestore から現在の設定を読み込む
    useEffect(() => {
        if (!user) {
            setEnabled(false);
            return;
        }
        getUserSettings(user.uid).then((settings) => {
            setEnabled(settings?.notificationsEnabled ?? false);
        });
    }, [user]);

    const toggle = async () => {
        if (!user || loading) return;
        setLoading(true);
        try {
            if (!enabled) {
                // オン: ブラウザ許可を要求して FCM トークンを取得・保存
                const token = await requestNotificationPermission();
                if (token) {
                    await updateUserSettings(user.uid, { notificationsEnabled: true, fcmToken: token });
                    setEnabled(true);
                } else {
                    // 許可が拒否 or 非対応ブラウザ
                    alert(
                        "通知の許可が必要です。\nブラウザのアドレスバー左のアイコンから通知を許可してください。"
                    );
                }
            } else {
                // オフ: Firestore の設定を更新するだけでよい（FCM トークンは残す）
                await updateUserSettings(user.uid, { notificationsEnabled: false });
                setEnabled(false);
            }
        } catch (error) {
            console.error("Failed to toggle notification settings:", error);
        } finally {
            setLoading(false);
        }
    };

    return { enabled, loading, toggle };
}
