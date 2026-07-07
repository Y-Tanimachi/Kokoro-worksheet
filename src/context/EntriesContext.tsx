"use client";

import { createContext, useContext, ReactNode } from "react";
import { useWorksheetEntries } from "@/hooks/useWorksheetEntries";

// ワークシートエントリの取得結果を子コンポーネント間で共有するための Context。
// ホーム画面では WorksheetList と WeeklyAnalytics が同じデータを必要とするため、
// Provider で1度だけ取得して共有し、Firestore の重複読み取りを防ぐ。
type EntriesContextValue = ReturnType<typeof useWorksheetEntries>;

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({ children }: { children: ReactNode }) {
    const value = useWorksheetEntries();
    return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

export function useEntries(): EntriesContextValue {
    const ctx = useContext(EntriesContext);
    if (!ctx) {
        throw new Error("useEntries must be used within an EntriesProvider");
    }
    return ctx;
}
