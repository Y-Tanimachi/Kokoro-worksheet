import { describe, it, expect } from "vitest";
import { toDatetimeLocalJST, getTodayStartJST } from "./date";

describe("toDatetimeLocalJST", () => {
    it("UTC の瞬間を JST の壁時計時刻（分精度）に変換する", () => {
        // 2026-07-07T00:00:00Z は JST 09:00
        expect(toDatetimeLocalJST(new Date("2026-07-07T00:00:00Z"))).toBe("2026-07-07T09:00");
    });

    it("JST の日付境界をまたぐと日付が繰り上がる", () => {
        // 2026-07-06T15:30:00Z は JST 2026-07-07T00:30
        expect(toDatetimeLocalJST(new Date("2026-07-06T15:30:00Z"))).toBe("2026-07-07T00:30");
    });

    it("秒・ミリ秒は切り捨てられる（分精度）", () => {
        expect(toDatetimeLocalJST(new Date("2026-07-07T00:00:59.999Z"))).toBe("2026-07-07T09:00");
    });
});

describe("getTodayStartJST", () => {
    it("その瞬間が属する JST 日付の 00:00 を返す", () => {
        expect(getTodayStartJST(new Date("2026-07-07T02:00:00Z"))).toBe("2026-07-07T00:00");
    });

    it("UTC ではまだ前日でも JST の日付で判定する", () => {
        // 2026-07-06T16:00:00Z は JST 2026-07-07T01:00
        expect(getTodayStartJST(new Date("2026-07-06T16:00:00Z"))).toBe("2026-07-07T00:00");
    });

    it("同形式の記録タイムスタンプと辞書順比較して当日判定が成立する", () => {
        const start = getTodayStartJST(new Date("2026-07-07T02:00:00Z"));
        // 当日 00:00 ちょうどの記録は「今日あり」と判定される（>= 境界を含む）
        expect("2026-07-07T00:00" >= start).toBe(true);
        // 当日の任意時刻は含む
        expect("2026-07-07T14:30" >= start).toBe(true);
        // 前日は含まない
        expect("2026-07-06T23:59" >= start).toBe(false);
    });
});
