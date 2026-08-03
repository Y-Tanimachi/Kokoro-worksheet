# Architecture Decision Records

このディレクトリには、Kokoro Worksheet の設計判断を 1 決定 1 ファイルで記録しています。

## これらの ADR について

ADR-0001 から ADR-0011 は **事後記録** です。決定した当時に書いたものではなく、2026-08-03 時点のコードと Git 履歴から再構成しました。そのため次の点に注意してください。

- **Date** は Git 履歴から推定した実際の決定時期です。ADR を書いた日ではありません。
- **Options Considered** に並ぶ選択肢は、当時そのすべてを比較検討した記録ではありません。決定の背景を後から説明するために整理したものです。
- **Consequences** は実際に起きたことを書いています。ここが事後記録の一番の価値で、当時の想定ではなく実績です。

今後の決定は、判断する時点で ADR を書いてください。

## 一覧

| # | 決定 | Status |
|---|---|---|
| [0001](0001-nextjs-app-router-vercel.md) | アプリ基盤に Next.js（App Router）を採用し Vercel にデプロイする | Accepted |
| [0002](0002-firebase-as-backend.md) | バックエンドを Firebase（Auth / Firestore / FCM）に寄せる | Accepted |
| [0003](0003-fetch-all-entries-client-filter.md) | エントリは全件取得し、期間の絞り込みと集計はクライアントで行う | Accepted |
| [0004](0004-jst-wall-clock-string-datetime.md) | 日時は JST の壁時計文字列（`YYYY-MM-DDTHH:MM`）で統一する | Accepted |
| [0005](0005-no-state-management-library.md) | 状態管理ライブラリを導入せず React Context とカスタムフックで構成する | Accepted |
| [0006](0006-tailwind-v4-handwritten-shadcn.md) | Tailwind CSS v4 と、手書きの shadcn/ui スタイルコンポーネントを使う | Accepted |
| [0007](0007-gemini-with-mandatory-fallback.md) | 応援メッセージは Gemini で生成し、失敗時は必ず定型文を返す | Accepted |
| [0008](0008-ai-endpoint-protection.md) | AI エンドポイントを ID トークン検証と Firestore トランザクションによるレートリミットで保護する | Accepted |
| [0009](0009-github-actions-cron.md) | 通知バッチのスケジューラに GitHub Actions を使う | Accepted（再検討候補） |
| [0010](0010-handwritten-pwa-service-worker.md) | PWA と Service Worker をライブラリなしで手書きする | Accepted |
| [0011](0011-unit-tests-pure-functions-only.md) | テストは Vitest による純粋関数のユニットテストに限定する | Accepted |

## 現在のバージョン（2026-08-03 時点）

`package-lock.json` の解決済みバージョンです。

| 区分 | パッケージ | バージョン |
|---|---|---|
| フレームワーク | next | 16.2.6 |
| | react / react-dom | 19.2.3 |
| | typescript | 5.9.3 |
| スタイリング | tailwindcss / @tailwindcss/postcss | 4.1.18 |
| | radix-ui | 1.4.3 |
| | lucide-react | 0.563.0 |
| | class-variance-authority | 0.7.1 |
| | tailwind-merge | 3.4.0 |
| バックエンド | firebase | 12.8.0 |
| | firebase-admin | 13.10.0 |
| | @google/genai | 2.10.0（モデル: `gemini-2.5-flash`） |
| ユーティリティ | date-fns | 4.1.0 |
| 計測 | @vercel/analytics | 1.6.1 |
| 品質 | eslint | 9.39.2（flat config） |
| | vitest | 3.2.7 |

依存の脆弱性対応として `package.json` の `overrides` で `protobufjs` / `postcss` / `uuid` / `@tootallnate/once` を強制昇格しています（2026-05-30）。Dependabot と Renovate は未設定です。

## 新しい ADR の書き方

1. 連番の次の番号でファイルを作る（`00XX-kebab-case-title.md`）
2. Status は `Proposed` から始め、決まったら `Accepted` にする
3. 決定を覆すときは古い ADR を `Superseded by ADR-00YY` に変え、新しい ADR に `Supersedes ADR-00XX` を書く。**古い ADR は消さない**
4. この README の一覧に行を足す

## 未対応の Action Items（横断）

各 ADR の Action Items のうち、実装の整理につながるもの。

- `cn` の import 元の統一と `src/lib/utils.ts` の整理（[0006](0006-tailwind-v4-handwritten-shadcn.md)）
- 個別 `@radix-ui/*` 3 種を `radix-ui` メタパッケージに寄せる（[0006](0006-tailwind-v4-handwritten-shadcn.md)）
- 未使用の `tw-animate-css` を削除する（[0006](0006-tailwind-v4-handwritten-shadcn.md)）
- `manifest.json` のアイコンパスと実ファイル名の不一致（[0010](0010-handwritten-pwa-service-worker.md)）
- CI で lint とテストを走らせる（[0011](0011-unit-tests-pure-functions-only.md)）
- `firestore.rules` のデプロイ手順化（[0002](0002-firebase-as-backend.md)）

なお `@opentelemetry/api` が dependencies にありますが `src/` 内で使われていません（2026-02-04 に AI メッセージ API と同時に追加）。firebase-admin の optional peer 警告への対処と思われますが、意図が記録に残っていないため ADR にはしていません。
