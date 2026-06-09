import { UserSettings } from "@/types";
import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const COLLECTION = "user_settings";

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
    if (!userId) return null;
    try {
        const ref = doc(db, COLLECTION, userId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return snap.data() as UserSettings;
    } catch (error) {
        console.error("Error getting user settings:", error);
        return null;
    }
};

export const updateUserSettings = async (
    userId: string,
    settings: Partial<Omit<UserSettings, "updatedAt">>
): Promise<void> => {
    if (!userId) return;
    try {
        const ref = doc(db, COLLECTION, userId);
        await setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
        console.error("Error updating user settings:", error);
        throw error;
    }
};
