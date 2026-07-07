import { WorksheetEntry, Emotion } from "@/types";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

// 統計で扱う感情の並び順（WorksheetFormの表示順と揃えている）
const EMOTIONS: Emotion[] = ["怒り", "悲しみ", "喜び", "不安", "疲労", "無力感", "愛情", "その他"];

export interface EmotionStat {
    emotion: Emotion;
    // score: 同じ感情のエントリの emotionStrength 合計値（出現回数×強さ）
    score: number;
    // count: その感情が記録された回数
    count: number;
}

// 指定区間内のエントリを感情ごとに集計し、スコア降順で返す
const aggregateStats = (entries: WorksheetEntry[], interval: { start: Date, end: Date }): EmotionStat[] => {
    const filteredEntries = entries.filter((entry) => {
        const date = new Date(entry.createdAt);
        return isWithinInterval(date, interval);
    });

    // Initialize stats map
    const statsMap: Record<string, { score: number, count: number }> = {};
    EMOTIONS.forEach(e => {
        statsMap[e] = { score: 0, count: 0 };
    });

    // Aggregate scores
    filteredEntries.forEach(entry => {
        entry.emotions.forEach(emotion => {
            if (statsMap[emotion]) {
                statsMap[emotion].score += entry.emotionStrength;
                statsMap[emotion].count += 1;
            }
        });
    });

    // Convert to array and sort by score (descending)
    return EMOTIONS.map(emotion => ({
        emotion,
        score: statsMap[emotion].score,
        count: statsMap[emotion].count
    })).sort((a, b) => b.score - a.score);
};

/**
 * Calculates emotion statistics for the week containing `now` (Monday to Sunday).
 * `now` はテスト容易性のため注入可能。省略時は現在時刻。
 */
export const getWeeklyStats = (entries: WorksheetEntry[], now: Date = new Date()): EmotionStat[] => {
    // Week starts on Monday (1)
    return aggregateStats(entries, {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
    });
};

/**
 * Calculates emotion statistics for the calendar month containing `now` (1st to last day).
 * `now` はテスト容易性のため注入可能。省略時は現在時刻。
 */
export const getMonthlyStats = (entries: WorksheetEntry[], now: Date = new Date()): EmotionStat[] => {
    return aggregateStats(entries, {
        start: startOfMonth(now),
        end: endOfMonth(now),
    });
};

/**
 * Identifies the emotion with the highest score.
 */
export const getDominantEmotion = (stats: EmotionStat[]): EmotionStat | null => {
    if (stats.length === 0) return null;

    // Since getWeeklyStats/getMonthlyStats sort by score, the first one is the dominant one.
    // But checking strictly just in case logic changes or unsorted input.
    const max = stats.reduce((prev, current) => {
        return (prev.score > current.score) ? prev : current;
    }, stats[0]);

    if (max.score === 0) return null;
    return max;
};
