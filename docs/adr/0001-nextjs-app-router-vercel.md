# ADR-0001: アプリ基盤に Next.js（App Router）を採用し Vercel にデプロイする

**Status:** Accepted
**Date:** 2026-02-03（事後記録: 2026-08-03）
**Deciders:** Y-Tanimachi（単独開発）

## Context

個人利用を前提とした CBT ワークシートアプリを作る。画面はワークシートの入力・一覧・詳細の 3 系統で、SPA 的な操作感があれば足りる。ただしフロントエンドだけでは完結しない処理が 2 つある。

- Gemini API の呼び出し。API キーをクライアントに置けないため、サーバー側の実行環境が要る。
- 通知バッチの受け口。Firebase Admin SDK の秘密鍵を使うため、同じくサーバー側が要る。

単独開発で運用に手間をかけられないので、フロントとサーバー処理を別々にデプロイ・監視する構成は避けたい。

## Decision

Next.js の App Router を使い、画面と API Route（`src/app/api/`）を 1 リポジトリ・1 デプロイにまとめる。ホスティングは Vercel。`next.config.ts` は空のままにして、ビルド設定は Vercel のデフォルトに委ねる。

API Route には `export const runtime` を宣言せず、Node.js ランタイムで動かす。

## Options Considered

### Option A: Next.js（App Router）+ Vercel

| Dimension | Assessment |
|---|---|
| Complexity | Low（1 リポジトリ・1 デプロイ） |
| Cost | 無料枠で収まる |
| Scalability | 個人利用の規模では問題にならない |
| Team familiarity | High |

**Pros:** サーバー処理を足すときにファイルを 1 つ増やすだけで済む。Vercel との統合でデプロイ設定がほぼ不要。`@vercel/analytics` などの周辺ツールがそのまま使える。
**Cons:** Vercel への依存が強くなる。フレームワークのメジャーバージョン追従が必要。

### Option B: Vite + React の SPA と Cloud Functions を分離

| Dimension | Assessment |
|---|---|
| Complexity | Medium（2 つのデプロイ対象） |
| Cost | 無料枠で収まる |
| Scalability | 十分 |
| Team familiarity | Medium |

**Pros:** フロントのビルドが速く単純。バックエンドを Firebase 側に寄せられる。
**Cons:** デプロイ・環境変数・CORS をそれぞれ管理することになる。単独開発では管理対象が 2 倍になる負担が大きい。

### Option C: Firebase Hosting + Cloud Functions に全部寄せる

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | 無料枠で収まる |
| Scalability | 十分 |
| Team familiarity | Low |

**Pros:** Firebase に一本化でき、認証情報の受け渡しが素直。
**Cons:** Functions のコールドスタートとデプロイの遅さ。Next.js の開発体験を捨てることになる。

## Trade-off Analysis

判断軸は「運用対象の数」だった。B と C は構成として悪くないが、単独開発では監視・デプロイ・シークレット管理の対象が増えること自体がコストになる。A なら `git push` 一回でフロントとサーバーが同時に更新され、環境変数も Vercel の 1 箇所で済む。

Vercel へのロックインは受け入れた。実際に依存しているのは環境変数の管理とビルドパイプラインだけで、Next.js のアプリケーションコード自体は他のホスティングにも移せる。ただし後から追加した Protection Bypass ヘッダー（[ADR-0009](0009-github-actions-cron.md)）は Vercel 固有の仕組みで、ここは移行時に書き換えが要る。

## Consequences

- サーバー処理の追加コストがほぼゼロになった。`/api/ai-message` と `/api/notifications/send` はどちらも新しい実行環境を用意せずに追加できている。
- Firebase Admin SDK は Edge Runtime で動かないため、API Route は Node.js ランタイムに固定される。Edge へ移す選択肢は事実上ない。
- `next.config.ts` が空なので、ビルドの挙動はフレームワークと Vercel のデフォルトに依存する。独自ヘッダー、リダイレクト、画像最適化の設定が必要になった時点でこの前提は崩れる。
- `vercel.json` を置いていないため、デプロイ設定がリポジトリに残っていない。設定はダッシュボードにしかなく、再構築時に手で復元することになる。

## Action Items

1. [ ] Vercel ダッシュボード側の設定（環境変数名、ビルドコマンド、リージョン）を README かこの ADR に控えておく
2. [ ] Next.js のメジャーバージョン更新時に App Router の破壊的変更を確認する運用を決める
