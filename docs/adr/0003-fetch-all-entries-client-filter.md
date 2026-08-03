# ADR-0003: エントリは全件取得し、期間の絞り込みと集計はクライアントで行う

**Status:** Accepted
**Date:** 2026-02-04（2026-07-07 に `EntriesProvider` で共有化 / 事後記録: 2026-08-03）
**Deciders:** Y-Tanimachi（単独開発）

## Context

ホーム画面には 2 つの表示がある。ワークシートの一覧（`WorksheetList`）と、今週・今月の感情レポート（`EmotionAnalytics`）。どちらも同じエントリ群を見る。

当初は各コンポーネントがそれぞれ Firestore を読んでいたため、ホームを開くたびに同じデータを 2 回読んでいた。また感情レポートにタブ（今週 / 今月）を足すとき、期間ごとに別クエリを投げる作りだと軸を増やすたびに Firestore のクエリと複合インデックスを触ることになる。

## Decision

エントリは `orderBy("createdAt", "desc")` で全件取得する。期間の絞り込みと集計はすべてクライアント側の純粋関数（`src/utils/statistics.ts` の `aggregateStats`）で行う。

取得は `EntriesProvider`（`src/context/EntriesContext.tsx`）が 1 回だけ実行し、`WorksheetList` と `EmotionAnalytics` が結果を共有する。

## Options Considered

### Option A: 全件取得 + クライアント側フィルタ

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | 記録件数に比例した読み取り |
| Scalability | 件数が増えると劣化する |
| Team familiarity | High |

**Pros:** 集計軸を増やしても Firestore 側は無変更。複合インデックスが不要。集計ロジックが純粋関数になるのでテストしやすい（[ADR-0011](0011-unit-tests-pure-functions-only.md)）。
**Cons:** 記録件数に比例して読み取り数・転送量・初回表示時間が増える。

### Option B: 期間ごとに `where` クエリを投げる

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | 必要な分だけ読む |
| Scalability | 良い |
| Team familiarity | High |

**Pros:** 読み取り数が表示期間に比例するだけで済む。
**Cons:** 一覧と集計で別クエリになり、同じデータを重複して読む。軸を追加するたびにクエリとインデックスの追加が要る。タブ切り替えのたびに通信が発生する。

### Option C: 集計結果を別ドキュメントに事前計算する

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Cost | 読み取りは最小 |
| Scalability | 良い |
| Team familiarity | Medium |

**Pros:** 件数が増えても読み取りコストが一定。
**Cons:** 書き込み時の集計更新（Cloud Functions か API 経由）が必要。集計軸を変えると過去分の再計算が要る。個人アプリの規模に対して重い。

## Trade-off Analysis

想定利用は 1 日 1 件、多くて数件。1 年続けても数百件で、1 件あたりのフィールド数もたかが知れている。この規模なら全件取得のコストは無視できる。

一方、集計軸を増やす作業は実際に発生した（週次のみ → 今週 / 今月のタブ切り替え、2026-07-07）。このとき Option A なら `aggregateStats` に引数を足すだけで済み、Firestore 側は一切触っていない。変更頻度の高い方を軽くする判断として妥当だった。

Option C は明確な過剰設計。Option B は将来件数が増えたときの移行先として残しておく。

## Consequences

- 集計の追加・変更が `src/utils/statistics.ts` の中で閉じる。Firestore のインデックス定義ファイルをリポジトリに持つ必要がない。
- ホーム画面の Firestore 読み取りが 1 回で済む。`EntriesProvider` を経由しない新しいコンポーネントを足すと、この前提が崩れて重複読み取りが復活する。
- 記録件数が増えると初回表示が遅くなる。**再検討ライン: 1 ユーザーあたり数百件**。そこを超えたら Option B（期間クエリ）への部分移行を検討する。
- 詳細ページだけは例外で、`getEntry()` で 1 件だけ取る（全件取得を避けるため）。一覧と詳細でデータ取得経路が 2 系統ある点は意識しておく必要がある。

## Action Items

1. [ ] 記録件数が 300 件を超えたら初回表示時間を実測し、Option B への移行を判断する
2. [ ] 新しくエントリを参照する画面を足すときは `EntriesProvider` 経由にする（重複読み取りの再発防止）
