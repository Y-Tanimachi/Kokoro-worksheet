# ADR-0011: テストは Vitest による純粋関数のユニットテストに限定する

**Status:** Accepted
**Date:** 2026-02-04（2026-07-07 に集計テストを拡充 / 事後記録: 2026-08-03）
**Deciders:** Y-Tanimachi（単独開発）

## Context

このアプリで壊れると気づきにくいのは、日付境界と期間集計のロジックだった。

- 週の始まりが月曜かどうか、月末月初の記録がどちらの月に入るか
- 「今日（JST）の記録があるか」の判定（[ADR-0004](0004-jst-wall-clock-string-datetime.md)）

これらは見た目では間違いに気づけず、境界の日にだけ壊れる。一方、UI の不具合（ボタンが効かない、表示が崩れる）は手で触ればすぐ分かる。

単独開発でテストに割ける時間は限られている。

## Decision

Vitest を使い、**`src/utils/` の純粋関数だけ**をテストする。

- `vitest.config.ts` の `include` は `src/**/*.test.ts`（`.tsx` を含めない）
- `environment: node`（jsdom を使わない）
- 現在あるのは `date.test.ts` と `statistics.test.ts` の 2 本

React コンポーネントのテスト基盤（Testing Library、jsdom）と E2E は持たない。

集計関数は現在時刻を `now` 引数で注入してテストする（`statistics.test.ts` の `makeEntry` / `NOW` パターン）。**日付境界に関わる変更では境界テストを必ず追加する。**

## Options Considered

### Option A: 純粋関数のユニットテストのみ

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | 設定 14 行 |
| Scalability | カバー範囲は広がらない |
| Team familiarity | High |

**Pros:** 設定が最小で済む（jsdom もセットアップファイルも不要）。テストが速い。壊れると困る部分を正確に狙える。
**Cons:** UI とデータ取得の回帰は検知できない。

### Option B: Testing Library でコンポーネントテストも書く

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | 依存 3〜4 つ + 環境設定 |
| Scalability | 良い |
| Team familiarity | Medium |

**Pros:** フォームの入力から保存までの流れを検証できる。
**Cons:** Firebase SDK と Context のモックが必要で、テストの準備コードが本体より長くなりやすい。壊れやすく、メンテナンスの負担が続く。

### Option C: Playwright で E2E

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Cost | CI 時間 + 実行環境 |
| Scalability | 良い |
| Team familiarity | Low |

**Pros:** 本物に近い形で通しの動作を確認できる。
**Cons:** Google ログインを通す必要があり、テスト用アカウントとエミュレータの整備が要る。個人アプリに対して重い。

## Trade-off Analysis

「壊れたときに気づけるか」で切り分けた。UI の不具合は使えば分かるので手動確認で足りる。日付境界は使っても分からないので自動テストで守る。この線引きだと Option A で必要十分になる。

Option B / C を入れないコストは、Firebase 依存のモックとテスト用アカウントの整備を丸ごと省けること。単独開発ではこの節約が大きい。

## Consequences

- テストの実行が速く、設定ファイルが `vitest.config.ts` 14 行だけで済んでいる。
- 日付境界と集計のリグレッションは自動で防げる。実際、感情レポートに月次タブを足したとき（2026-07-07）も既存の境界テストが安全網になった。
- UI とデータ取得の回帰は手動確認に頼る。フォームの必須項目の扱い、保存後の遷移、通知設定の ON/OFF などはテストされていない。
- API Route（`/api/ai-message`、`/api/notifications/send`）にテストが無い。認証、レートリミット、通知の当日判定といった壊れると影響の大きいロジックが手動確認のみ。ただしこれらは Firebase Admin SDK に強く依存しており、テストするならエミュレータが要る。
- **CI で lint とテストが走っていない。** GitHub Actions のワークフローは通知クロン 1 本だけで、テストは手元で `npm test` を実行しない限り走らない。テストがあっても実行されなければ意味がないので、ここは穴になっている。

## Action Items

1. [ ] CI ワークフロー（`npm run lint` + `npm test`）を追加して PR で自動実行する
2. [ ] `/api/notifications/send` の当日判定ロジックを純粋関数に切り出してテスト可能にする
