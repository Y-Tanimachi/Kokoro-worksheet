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

// Firestoreのデータ構造: users/{userId}/entries/{entryId}
// ユーザーごとにサブコレクションを持つことでFirestoreルールによるアクセス制御が容易になる

// 指定ユーザーの全エントリを新しい順に取得する
export const getEntries = async (userId: string): Promise<WorksheetEntry[]> => {
    if (!userId) return [];

    try {
        const entriesRef = collection(db, "users", userId, "entries");
        // createdAt の降順（新しいもの優先）で取得
        const q = query(entriesRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => doc.data() as WorksheetEntry);
    } catch (error) {
        console.error("Error getting entries:", error);
        return [];
    }
};

// エントリを保存する。entry.id をドキュメントIDとして使うため setDoc で上書き可能
// AIメッセージ付与後に再度呼ばれるため、新規保存・更新の両方に使われる
export const saveEntry = async (userId: string, entry: WorksheetEntry): Promise<void> => {
    if (!userId) return;

    try {
        const entryRef = doc(db, "users", userId, "entries", entry.id);
        await setDoc(entryRef, entry);
    } catch (error) {
        console.error("Error saving entry:", error);
        throw error;
    }
};

// 指定IDのエントリを削除する
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
