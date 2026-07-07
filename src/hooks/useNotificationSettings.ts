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

        let cancelled = false;

        getUserSettings(user.uid).then(async (settings) => {
            if (cancelled) return;
            const isEnabled = settings?.notificationsEnabled ?? false;
            setEnabled(isEnabled);

            // 通知ONユーザーはトークンが失効している可能性がある。
            // FCMトークンは時間経過やブラウザ都合で無効化されるため、起動時に取り直して
            // 変化していれば保存し直す（放置すると「UIはONなのに通知が来ない」状態になる）。
            //
            // ただし再同期は「このブラウザで既に許可済み」の場合のみ行う。
            // permission が "default" の状態で requestPermission() を呼ぶと、ユーザー操作なしに
            // 許可プロンプトが出てしまう（一部ブラウザは gesture 無しの要求を拒否する）ため。
            const alreadyGranted =
                typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "granted";

            if (isEnabled && alreadyGranted) {
                const result = await requestNotificationPermission();
                if (cancelled) return;
                if (result.status === "ok" && result.token !== settings?.fcmToken) {
                    await updateUserSettings(user.uid, { fcmToken: result.token });
                }
            }
        });

        return () => {
            cancelled = true;
        };
    }, [user]);

    const toggle = async () => {
        if (!user || loading) return;
        setLoading(true);
        try {
            if (!enabled) {
                // オン: ブラウザ許可を要求して FCM トークンを取得・保存
                const result = await requestNotificationPermission();
                if (result.status === "ok") {
                    await updateUserSettings(user.uid, { notificationsEnabled: true, fcmToken: result.token });
                    setEnabled(true);
                } else if (result.status === "denied") {
                    alert(
                        "通知がブロックされています。\nブラウザのアドレスバー左のアイコンから、通知を「許可」に変更してください。"
                    );
                } else if (result.status === "unsupported") {
                    alert(
                        "お使いのブラウザ・端末は通知に対応していません。\niPhone / iPad の場合は、ホーム画面に追加すると利用できることがあります。"
                    );
                } else {
                    alert("通知の設定に失敗しました。時間をおいて再度お試しください。");
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
