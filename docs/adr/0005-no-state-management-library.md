# ADR-0005: 状態管理ライブラリを導入せず React Context とカスタムフックで構成する

**Status:** Accepted
**Date:** 2026-02-04（事後記録: 2026-08-03）
**Deciders:** Y-Tanimachi（単独開発）

## Context

アプリ全体で共有する状態は 2 つしかない。

- ログインユーザー（`AuthContext`）— ヘッダーの表示、Firestore の読み書き先、ID トークンの取得に使う
- エントリ一覧（`EntriesContext`）— 一覧と感情レポートで共有する（[ADR-0003](0003-fetch-all-entries-client-filter.md)）

画面数は 3 つ（ホーム、新規作成、詳細）。サーバー状態のキャッシュ・再検証を細かく制御したい要件はない。

## Decision

状態管理ライブラリ（Redux、Zustand、Jotai など）とサーバー状態ライブラリ（TanStack Query、SWR）をいずれも導入しない。

React の Context を 2 つ（`src/context/`）と、機能単位のカスタムフック（`src/hooks/useWorksheetEntries.ts`、`useNotificationSettings.ts`）で構成する。ローディングとエラーの状態はフックの中で `useState` で持つ。

## Options Considered

### Option A: React Context + カスタムフック

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | 依存追加なし |
| Scalability | Context が増えると破綻する |
| Team familiarity | High |

**Pros:** 依存が増えない。React の標準機能だけで完結し、学習コストがゼロ。状態の流れが `Provider → hook → component` で追いやすい。
**Cons:** キャッシュ、再検証、リトライ、楽観的更新は全部自前。Context の値が変わると配下が全部再レンダリングされる。

### Option B: TanStack Query

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | 依存 1 つ |
| Scalability | 良い |
| Team familiarity | Medium |

**Pros:** サーバー状態のキャッシュ・重複排除・再検証が宣言的に書ける。[ADR-0003](0003-fetch-all-entries-client-filter.md) の「1 回だけ取得して共有する」がライブラリの標準機能で実現できる。
**Cons:** この規模では機能が余る。Firestore のリアルタイム購読と組み合わせる場合、キャッシュの二重管理になりやすい。

### Option C: Zustand などのクライアント状態ライブラリ

| Dimension | Assessment |
|---|---|
| Complexity | Low〜Medium |
| Cost | 依存 1 つ |
| Scalability | 良い |
| Team familiarity | Medium |

**Pros:** 再レンダリングの制御が細かくできる。Provider のネストが不要。
**Cons:** 共有状態が 2 つしかない現状では、導入しても書き味がほとんど変わらない。

## Trade-off Analysis

共有状態が 2 つで画面が 3 つという規模では、どの選択肢を取っても書くコードの量はほぼ同じになる。だとすれば依存を増やさない方を選ぶ。

TanStack Query は「重複読み取りを防ぐ」という実際に発生した課題（2026-07-07 の `EntriesProvider` 導入）をライブラリ側で解決してくれるので、後から入れる価値はある。ただしそのときは Context 2 つを置き換える形になり、移行コストは小さい。今の時点で先回りして入れる理由がなかった。

## Consequences

- `package.json` の依存が増えない。ビルドサイズと更新追従の負担が減る。
- キャッシュの無効化、リトライ、楽観的更新はすべて手書きになる。現在それらの機能はどこにも実装されておらず、保存後は画面遷移で作り直している。
- `EntriesProvider` を経由しないコンポーネントを足すと重複読み取りが起きる。ライブラリなら自動で防げる問題を、規約で守っている状態。
- Context の値が更新されると配下が全部再レンダリングされる。エントリ数が数百件になり一覧の描画が重くなったら、ここがボトルネックになる可能性がある。
- **再検討ライン: Context が 4 つ以上になる、またはサーバー状態のキャッシュ制御が必要になったとき。** そのときは TanStack Query（Option B）を第一候補とする。

## Action Items

1. [ ] Context を追加したくなったら、その時点で Option B への移行を検討する
