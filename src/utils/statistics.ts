import { WorksheetEntry, Emotion } from "@/types";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

const EMOTIONS: Emotion[] = ["怒り", "悲しみ", "喜び", "不安", "疲労", "無力感", "愛情", "その他"];

export interface EmotionStat {
    emotion: Emotion;
    score: number;
    count: number;
}

/**
 * Calculates emotion statistics for the current week (Monday to Sunday).
 */
export const getWeeklyStats = (entries: WorksheetEntry[]): EmotionStat[] => {
    const now = new Date();
    // Week starts on Monday (1)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Filter entries for the current week
    const weeklyEntries = entries.filter((entry) => {
        const date = new Date(entry.createdAt);
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
    });

    // Initialize stats map
    const statsMap: Record<string, { score: number, count: number }> = {};
    EMOTIONS.forEach(e => {
        statsMap[e] = { score: 0, count: 0 };
    });

    // Aggregate scores
    weeklyEntries.forEach(entry => {
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
 * Identifies the emotion with the highest score.
 */
export const getDominantEmotion = (stats: EmotionStat[]): EmotionStat | null => {
    if (stats.length === 0) return null;

    // Since getWeeklyStats sorts by score, the first one is the dominant one.
    // But checking strictly just in case logic changes or unsorted input.
    const max = stats.reduce((prev, current) => {
        return (prev.score > current.score) ? prev : current;
    }, stats[0]);

    if (max.score === 0) return null;
    return max;
};
