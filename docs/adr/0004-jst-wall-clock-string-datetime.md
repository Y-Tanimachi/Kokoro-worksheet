# ADR-0004: 日時は JST の壁時計文字列（`YYYY-MM-DDTHH:MM`）で統一する

**Status:** Accepted
**Date:** 2026-02-04（2026-06-09 のサーバー側判定で確定 / 事後記録: 2026-08-03）
**Deciders:** Y-Tanimachi（単独開発）

## Context

ワークシートの日時（`createdAt`）は `<input type="datetime-local">` で入力する。この入力欄が返す値は `YYYY-MM-DDTHH:MM` で、タイムゾーン情報を持たない。

一方、日時を読む側は 3 つある。

- ブラウザ（利用者は日本在住、ローカルタイムは JST）
- Vercel の API Route（UTC で動く）
- GitHub Actions のランナー（UTC で動く）

通知バッチは「今日（JST）の記録があるか」を判定する。ここでタイムゾーンの解釈がずれると、深夜や早朝に通知が誤爆する、あるいは出ない。

## Decision

`createdAt` はタイムゾーン表記を付けず、JST の壁時計時刻を表す文字列 `YYYY-MM-DDTHH:MM` として保存する。datetime-local の値をそのまま保存する形になる。

全データを同じ形式・同じ桁数に揃えることで、**文字列の辞書順比較がそのまま時系列比較として成立する**設計にする。

- 一覧の並び替え: Firestore の `orderBy("createdAt", "desc")` がそのまま使える
- サーバー側の日境界判定: `getTodayStartJST()` が返す同形式の文字列と `>=` で比較する（`src/utils/date.ts`、`/api/notifications/send`）
- 期間集計: `src/utils/statistics.ts` が date-fns で週（月曜始まり）・月の境界を計算する

## Options Considered

### Option A: タイムゾーン表記なしの JST 壁時計文字列

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | — |
| Scalability | JST 固定なら問題なし |
| Team familiarity | High |

**Pros:** datetime-local の値を変換せずに保存できる。文字列比較だけで日境界を判定でき、UTC で動くサーバー上でもタイムゾーン計算が要らない。Firestore の `orderBy` と範囲クエリがそのまま効く。
**Cons:** タイムゾーンが型に表れないため、`new Date()` に渡すと実行環境のローカル時刻として解釈される。JST 以外への対応が事実上できない。

### Option B: オフセット付き ISO 8601（`2026-02-04T18:15:00+09:00`）

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | — |
| Scalability | 多タイムゾーン対応が可能 |
| Team familiarity | High |

**Pros:** 曖昧さがない。`new Date()` で正しく解釈される。
**Cons:** 日境界の判定に毎回タイムゾーン変換が要る。サーバー（UTC）で「JST の今日」を出すために変換ライブラリを挟むことになる。オフセット表記が混在すると辞書順比較が壊れる。

### Option C: Firestore Timestamp

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | — |
| Scalability | 良い |
| Team familiarity | Medium |

**Pros:** Firestore ネイティブで、範囲クエリと並び替えが確実。
**Cons:** datetime-local との相互変換が必要。クライアント・Admin 双方で `Timestamp` 型を扱うことになり、型定義（`WorksheetEntry`）が SDK に依存する。

## Trade-off Analysis

利用者が JST 圏に限られる前提を受け入れるなら、Option A が圧倒的に単純になる。特に効いたのは通知バッチだった。UTC で動くサーバー上で「JST の今日 0 時」を求めて Timestamp と比較するより、同じ形式の文字列を作って `>=` で比較する方が、バグの入る余地が少ない。

Option A の危険は「型が嘘をつかない代わりに、型が何も語らない」こと。`createdAt: string` からは JST 前提が読み取れず、`new Date(entry.createdAt)` と書いた瞬間に静かに壊れる。この危険は型では防げないので、ドキュメント（CLAUDE.md）と境界テストで守る方針にした。

## Consequences

- サーバー側の日境界判定がタイムゾーンライブラリなしで書ける。`/api/notifications/send` は `getTodayStartJST()` の文字列と `where("createdAt", ">=", ...)` だけで JST の当日判定をしている。
- `new Date(entry.createdAt)` は実行環境のローカルタイムとして解釈される。JST 以外の環境（UTC のサーバー）でこれを書くと 9 時間ずれる。**この式はサーバー側コードで使ってはいけない。**
- 形式が 1 文字でも崩れる（秒を足す、オフセットを付ける）と辞書順比較が壊れ、並び順と日境界判定が同時に壊れる。新しい書き込み経路を足すときは形式の統一を必ず確認する。
- JST 以外のタイムゾーンには対応できない。多タイムゾーン対応が必要になったら、この決定ごと作り直すことになる（データ移行が必要）。
- 日付境界に関わる変更では境界テストを必ず追加する運用にしている（`statistics.test.ts` の `makeEntry` / `NOW` パターン、集計関数は `now` を引数で注入する）。

## Action Items

1. [ ] 日付境界に関わる変更では境界テストを追加する（既存の運用を継続）
2. [ ] `createdAt` に branded type（`type JstWallClock = string & { __brand: "jst" }`）を導入して誤用を型で弾けないか検討する
