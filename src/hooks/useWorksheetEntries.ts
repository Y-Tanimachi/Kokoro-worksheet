import { useState, useEffect } from "react";
import { WorksheetEntry } from "@/types";
import { getEntries } from "@/utils/storage";
import { useAuth } from "@/context/AuthContext";

// ワークシートエントリの取得ロジックを集約するカスタムフック
// WorksheetList / WeeklyAnalytics など複数コンポーネントから共有される
export function useWorksheetEntries() {
    const [entries, setEntries] = useState<WorksheetEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        const fetchEntries = async () => {
            if (user) {
                try {
                    const data = await getEntries(user.uid);
                    setEntries(data);
                } catch (error) {
                    console.error("Failed to fetch entries:", error);
                } finally {
                    setIsLoading(false);
                }
            } else if (!authLoading) {
                // 認証チェック完了後にもユーザーが null の場合は未ログイン確定
                setIsLoading(false);
                setEntries([]);
            }
            // authLoading が true の間は何もしない（認証状態確定を待つ）
        };

        fetchEntries();
    }, [user, authLoading]);

    return { entries, isLoading, user, authLoading };
}
