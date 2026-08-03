# ADR-0006: Tailwind CSS v4 と、手書きの shadcn/ui スタイルコンポーネントを使う

**Status:** Accepted
**Date:** 2026-02-03（事後記録: 2026-08-03）
**Deciders:** Y-Tanimachi（単独開発）

## Context

必要な UI 部品は多くない。ボタン、カード、入力欄、テキストエリア、ラベル、スライダー（感情の強さ 1〜10）、アバターとドロップダウン（ヘッダーのメニュー）、タブ（今週 / 今月の切り替え）。

自前でアクセシビリティを担保したドロップダウンやタブを書くのは避けたいが、Material UI のような重量級のコンポーネントライブラリを入れるほどでもない。

## Decision

**スタイリング**は Tailwind CSS v4 を使う。v4 では設定を CSS 側に書けるので、`tailwind.config.*` を持たず `src/app/globals.css` の中（`@import "tailwindcss"` / `@plugin` / `@custom-variant` / CSS 変数）に集約する。ビルドは PostCSS プラグイン `@tailwindcss/postcss` 経由。

**コンポーネント**は shadcn/ui の new-york スタイルを手書きで移植し、`src/components/ui/` に置く。shadcn CLI は使わない。実装の流儀は `forwardRef` + `cn` に揃える。

**Radix プリミティブ**は `radix-ui` メタパッケージから import する（例: `import { Tabs as TabsPrimitive } from "radix-ui"`）。新しいプリミティブを使うときに依存追加が要らない。

## Options Considered

### Option A: Tailwind + 手書きの shadcn/ui スタイル

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | 依存は Radix と cva のみ |
| Scalability | 部品が増えるほど手間も増える |
| Team familiarity | High |

**Pros:** コンポーネントのコードが手元にあるので、挙動を変えたいときに直接書き換えられる。Radix がアクセシビリティを担保する。必要な部品だけ持つのでバンドルが膨らまない。
**Cons:** 上流の shadcn/ui の改善を自動では取り込めない。部品ごとに手で書く初期コストがかかる。

### Option B: shadcn CLI で生成する

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | 同上 |
| Scalability | 良い |
| Team familiarity | High |

**Pros:** `npx shadcn add tabs` で一発。CLI が依存追加まで面倒を見る。
**Cons:** 個別の `@radix-ui/*` パッケージを部品ごとに追加していく。生成コードが既存の流儀（`cn` の import 元など）と揃わないことがある。

### Option C: MUI / Chakra などのコンポーネントライブラリ

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | 依存が重い |
| Scalability | 良い |
| Team familiarity | Medium |

**Pros:** 部品が最初から全部そろっている。
**Cons:** バンドルが大きい。デザインの方向性がライブラリに引っ張られる。Tailwind と併用すると二重管理になる。

## Trade-off Analysis

必要な部品が 9 個で打ち止めになる見込みだったので、手書きの初期コストは許容できた。逆に CLI を使うと、部品ごとに `@radix-ui/react-*` が 1 つずつ増えていく。`radix-ui` メタパッケージに寄せれば依存は 1 つで済む。

実際にはこの判断が中途半端に適用されていて、初期に作った button / label / slider は個別パッケージのまま残り、後から作った avatar / dropdown-menu / tabs だけがメタパッケージを使っている。同じ理由で `cn` の import 元も分裂している（下記 Consequences）。

## Consequences

- 新しい Radix プリミティブを使うのに `npm install` が要らない。`radix-ui` からの import だけで足りる。
- shadcn/ui 上流のバグ修正やアクセシビリティ改善は自動で入ってこない。必要なら手で取り込む。
- ダークモードの CSS 変数（`.dark`）と `@custom-variant` は定義済みだが、テーマを切り替える UI は実装されていない。配色の下地だけある状態。
- **依存が二重化している箇所が 3 つある。**
  - `radix-ui`（メタ）と `@radix-ui/react-label` / `-slider` / `-slot`（個別）が併存
  - `cn` が `@/utils/cn` と `@/lib/utils` の 2 箇所に同一実装で存在し、`src/components/ui/` の中でも import 元が分かれている（avatar と dropdown-menu が `@/lib/utils`、他は `@/utils/cn`）
  - `tailwindcss-animate`（`globals.css` の `@plugin` で実使用）と `tw-animate-css`（未使用）が両方入っている
- `components.json` は残してあるが CLI を使わない方針なので、実質ドキュメントとしての意味しかない。`aliases.utils` が `@/lib/utils` を指しており、これが `cn` 分裂の原因になっている。

## Action Items

1. [ ] `cn` の import 元を `@/utils/cn` に統一し、`src/lib/utils.ts` を削除するか再エクスポートだけにする
2. [ ] `@radix-ui/react-label` / `-slider` / `-slot` を `radix-ui` メタパッケージからの import に置き換えて個別依存を外す
3. [ ] 未使用の `tw-animate-css` を devDependencies から削除する
4. [ ] ダークモードの切り替え UI を実装するか、`.dark` の定義を消すか決める
