import { WorksheetEntry } from "@/types";

const STORAGE_KEY = "kokoro_worksheet_entries";

export const getEntries = (): WorksheetEntry[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

export const saveEntry = (entry: WorksheetEntry): void => {
    const entries = getEntries();
    const newEntries = [entry, ...entries];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
};

export const deleteEntry = (id: string): void => {
    const entries = getEntries();
    const newEntries = entries.filter((entry) => entry.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
}
