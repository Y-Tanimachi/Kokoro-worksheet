import { useState, useEffect } from "react";
import { WorksheetEntry } from "@/types";
import { getEntries } from "@/utils/storage";
import { useAuth } from "@/context/AuthContext";

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
                // Not logged in and auth check finished
                setIsLoading(false);
                setEntries([]);
            }
        };

        fetchEntries();
    }, [user, authLoading]);

    return { entries, isLoading, user, authLoading };
}
