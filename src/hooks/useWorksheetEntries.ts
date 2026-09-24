import { useState, useEffect, useCallback } from "react";
import { WorksheetEntry } from "@/types";
import { getEntries } from "@/utils/storage";
import { useAuth } from "@/context/AuthContext";

// ワークシートエントリの取得ロジックを集約するカスタムフック
// WorksheetList / EmotionAnalytics など複数コンポーネントから共有される
export function useWorksheetEntries() {
    const [entries, setEntries] = useState<WorksheetEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // 取得失敗を「記録なし」と区別して表示するためのエラー状態
    const [error, setError] = useState<Error | null>(null);
    const { user, loading: authLoading } = useAuth();

    // 初回取得と、エラー時の「再読み込み」ボタンの両方から呼ばれる
    const fetchEntries = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await getEntries(user.uid);
            setEntries(data);
        } catch (e) {
            console.error("Failed to fetch entries:", e);
            setError(e instanceof Error ? e : new Error(String(e)));
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchEntries();
        } else if (!authLoading) {
            // 認証チェック完了後にもユーザーが null の場合は未ログイン確定
            setIsLoading(false);
            setEntries([]);
            setError(null);
        }
        // authLoading が true の間は何もしない（認証状態確定を待つ）
    }, [user, authLoading, fetchEntries]);

    return { entries, isLoading, error, reload: fetchEntries, user, authLoading };
}
