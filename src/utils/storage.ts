import { WorksheetEntry } from "@/types";
import { db } from "./firebase";
import {
    collection,
    doc,
    setDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy
} from "firebase/firestore";

export const getEntries = async (userId: string): Promise<WorksheetEntry[]> => {
    if (!userId) return [];

    try {
        const entriesRef = collection(db, "users", userId, "entries");
        const q = query(entriesRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => doc.data() as WorksheetEntry);
    } catch (error) {
        console.error("Error getting entries:", error);
        return [];
    }
};

export const saveEntry = async (userId: string, entry: WorksheetEntry): Promise<void> => {
    if (!userId) return;

    try {
        // Use entry.id as the document ID
        const entryRef = doc(db, "users", userId, "entries", entry.id);
        await setDoc(entryRef, entry);
    } catch (error) {
        console.error("Error saving entry:", error);
        throw error;
    }
};

export const deleteEntry = async (userId: string, id: string): Promise<void> => {
    if (!userId) return;

    try {
        const entryRef = doc(db, "users", userId, "entries", id);
        await deleteDoc(entryRef);
    } catch (error) {
        console.error("Error deleting entry:", error);
        throw error;
    }
}
