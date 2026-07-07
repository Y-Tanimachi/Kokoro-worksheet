# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

自分の感情を整理する CBT（認知行動療法）風ワークシートアプリ。日々の出来事・感情・思考を10項目のワークシートに記録し、AI（Gemini）の応援メッセージと週次・月次の感情集計で振り返る。ワークシートの項目定義と記入例は README.md を参照。

技術スタック: Next.js（App Router）+ React + TypeScript / Firebase（Auth・Firestore・FCM）/ Tailwind CSS v4（設定は `src/app/globals.css` 内、tailwind.config は無い）/ Vitest。デプロイ先は Vercel。

## コマンド

```bash
npm run dev                              # 開発サーバー
npm run build                            # 本番ビルド
npm run lint                             # ESLint
npm test                                 # 全テスト（Vitest）
npm test -- src/utils/statistics.test.ts # 単一ファイルのテスト
npm run test:watch                       # watch モード
```

テスト対象は `src/**/*.test.ts` のみ（`vitest.config.ts`、environment: node）。React コンポーネントのテスト基盤は無く、純粋関数（`src/utils/`）のユニットテストのみ。

### ローカル環境のセットアップ

`.env.example` をコピーして `.env.local` を作成する（Gemini API キー / Firebase Admin サービスアカウント / VAPID 公開鍵 / CRON_SECRET）。

**既知のハマりどころ**: `npm run build` が `/api/notifications/send` のページデータ収集時に `Failed to parse private key ... DECODER routines::unsupported` で失敗することがある。原因は `.env.local` の `FIREBASE_PRIVATE_KEY` の形式（改行を `\n` リテラルに置換した1行文字列にする必要がある）。このエラーが出る時点でコンパイルと TypeScript チェックは既に通過しているため、コード変更自体の検証はそこまでで判断できる。Vercel 上ではダッシュボード側の環境変数が使われるため影響しない。

## アーキテクチャ

### データフローとFirestore構成

| コレクション | 内容 | アクセス経路 |
|---|---|---|
| `users/{uid}/entries/{entryId}` | ワークシート本体（`WorksheetEntry` 型 = `src/types/index.ts`） | クライアント SDK（`src/utils/storage.ts`） |
| `user_settings/{uid}` | 通知設定・FCM トークン | クライアント + Admin SDK |
| `user_limits/{uid}` | AI レートリミットのカウンター | Admin SDK 専用（クライアント直接書き込み禁止） |

- エントリ取得は**全件取得＋クライアント側フィルタ**が設計方針。ホームでは `EntriesProvider`（`src/context/EntriesContext.tsx`）が1回だけ取得し、`WorksheetList` と `EmotionAnalytics` で共有して Firestore の重複読み取りを防ぐ。期間集計を追加しても Firestore クエリの変更は不要。
- 認証は Google ポップアップログイン（`src/context/AuthContext.tsx`）。状態管理ライブラリは使わず、React Context + カスタムフック（`src/hooks/`）で構成。

### 日付の扱い（重要）

`createdAt` は**タイムゾーン表記なしの JST 壁時計文字列**（`YYYY-MM-DDTHH:MM`、datetime-local 形式）。全データを同一形式で統一することで文字列の辞書順比較が成立する設計（`src/utils/date.ts`）。サーバー側の「今日の記録があるか」判定もこの文字列比較で行う。`new Date(entry.createdAt)` は実行環境のローカルタイムとして解釈される点に注意。

期間集計は `src/utils/statistics.ts` の `aggregateStats` に共通化されている（週 = 月曜始まりのカレンダー週、月 = カレンダー月、date-fns 使用）。集計関数は `now` 引数を注入してテストする（`statistics.test.ts` の `makeEntry` / `NOW` パターン）。日付境界に関わる変更では境界テストを必ず追加する。

### サーバーサイド（API Routes）

Firebase Admin SDK（`src/utils/firebase-admin.ts`、サーバー専用・クライアントに露出禁止）を使う2つのエンドポイント:

- `POST /api/ai-message` — Gemini（`@google/genai`、使用モデルは route.ts の `MODEL_NAME`）で40〜70字の応援メッセージを生成。Firebase ID トークン検証＋Firestore トランザクションによるユーザー別レートリミット＋入力バリデーションの三重保護。**失敗時は必ずフォールバック文を返し、クライアントの保存フローを止めない**設計。
- `POST /api/notifications/send` — GitHub Actions のクロン（`.github/workflows/send-notifications.yml`、12:00 / 18:00 JST）から `CRON_SECRET` の Bearer 認証で呼ばれ、当日の記録が無いユーザーへ FCM プッシュを送る。無効トークンは自動クリーンアップする。

### UI コンポーネント

shadcn/ui スタイル（new-york）の自作コンポーネントを `src/components/ui/` に置く。**新しい Radix プリミティブは導入済みの `radix-ui` メタパッケージから import でき、依存追加は不要**（例: `import { Tabs as TabsPrimitive } from "radix-ui"`）。shadcn CLI は使わず、既存コンポーネントの流儀（forwardRef + `cn`）に合わせて手書きする。`cn` は既存コードでは `@/utils/cn` を使う（`@/lib/utils` は shadcn CLI 互換のための同一実装）。

## 規約

- コード内コメント・コミットメッセージは日本語。コミットは `feat:` / `fix:` プレフィックス。
- コメントは「なぜそうするか」（設計意図・制約）を書く文化。既存コードのコメント密度に合わせる。
