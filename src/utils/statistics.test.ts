import { describe, it, expect } from "vitest";
import { getWeeklyStats, getDominantEmotion } from "./statistics";
import { WorksheetEntry } from "@/types";

// テスト用のエントリを最小限のフィールドで生成するヘルパー
const makeEntry = (
    createdAt: string,
    emotions: WorksheetEntry["emotions"],
    emotionStrength: number
): WorksheetEntry => ({
    id: createdAt,
    createdAt,
    trigger: "",
    emotions,
    emotionStrength,
    automaticThought: "",
    alternativeThought: "",
    reaction: "",
    reflection: "",
    nextStep: "",
    praise: "",
});

// 基準週: 2026-07-06(月) 〜 2026-07-12(日) を含む水曜日
const NOW = new Date("2026-07-08T12:00:00");

describe("getWeeklyStats", () => {
    it("今週のエントリのみを集計する（先週は除外）", () => {
        const entries = [
            makeEntry("2026-07-07T10:00", ["怒り"], 5), // 今週
            makeEntry("2026-06-30T10:00", ["怒り"], 8), // 先週 → 除外
        ];
        const stats = getWeeklyStats(entries, NOW);
        const anger = stats.find((s) => s.emotion === "怒り")!;
        expect(anger.count).toBe(1);
        expect(anger.score).toBe(5);
    });

    it("同一感情の強度を合計し、出現回数を数える", () => {
        const entries = [
            makeEntry("2026-07-06T10:00", ["悲しみ"], 3),
            makeEntry("2026-07-08T10:00", ["悲しみ", "不安"], 4),
        ];
        const stats = getWeeklyStats(entries, NOW);
        const sadness = stats.find((s) => s.emotion === "悲しみ")!;
        expect(sadness.score).toBe(7);
        expect(sadness.count).toBe(2);
        const anxiety = stats.find((s) => s.emotion === "不安")!;
        expect(anxiety.score).toBe(4);
        expect(anxiety.count).toBe(1);
    });

    it("スコアの降順で返す", () => {
        const entries = [
            makeEntry("2026-07-07T10:00", ["喜び"], 2),
            makeEntry("2026-07-07T11:00", ["怒り"], 9),
        ];
        const stats = getWeeklyStats(entries, NOW);
        expect(stats[0].emotion).toBe("怒り");
    });
});

describe("getDominantEmotion", () => {
    it("最大スコアの感情を返す", () => {
        const entries = [
            makeEntry("2026-07-07T10:00", ["喜び"], 2),
            makeEntry("2026-07-07T11:00", ["怒り"], 9),
        ];
        const dominant = getDominantEmotion(getWeeklyStats(entries, NOW));
        expect(dominant?.emotion).toBe("怒り");
    });

    it("今週のデータが無ければ null を返す", () => {
        const entries = [makeEntry("2026-06-30T10:00", ["怒り"], 8)]; // 先週のみ
        const dominant = getDominantEmotion(getWeeklyStats(entries, NOW));
        expect(dominant).toBeNull();
    });
});
