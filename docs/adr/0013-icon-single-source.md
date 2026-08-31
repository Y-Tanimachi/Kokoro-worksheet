# ADR-0013: アイコン参照を定数モジュール 1 箇所に集約する

**Status:** Accepted
**Date:** 2026-08-31
**Deciders:** Y-Tanimachi（単独開発）

## Context

アプリアイコンのファイル名は 4 箇所に分散していた。

| 参照元 | 用途 |
| --- | --- |
| `src/app/manifest.json` | ホーム画面アイコン（any / maskable の 2 URL） |
| `public/firebase-messaging-sw.js` | 通知アイコン（バックグラウンド受信時） |
| `src/app/api/notifications/send/route.ts` | 通知アイコン（FCM の webpush 指定） |
| `src/app/icon.png` | favicon（Next.js のファイル規約） |

インストール済み端末はアイコンを URL 単位でキャッシュするため、差し替えのたびに**ファイル名の連番を上げる**運用にしている（ADR-0010 の PWA 構成に由来）。つまり差し替えのたびに 4 箇所すべての書き換えが必要で、実際に manifest だけ更新してアイコンが約 2 か月 404 になる障害が起きた。README に手順書を整備して再発を防いでいたが、人間の注意力に依存する状態が残っていた（[issue #18](https://github.com/Y-Tanimachi/Kokoro-worksheet/issues/18)）。

## Decision

ファイル名の定義を `src/constants/icon.ts`（`ICON_PATH` / `MASKABLE_ICON_PATH`）に集約し、各参照元を次のように変えた（[PR #19](https://github.com/Y-Tanimachi/Kokoro-worksheet/pull/19)）。

- `src/app/manifest.json` → `src/app/manifest.ts`（Next.js の `MetadataRoute.Manifest` 規約）に変換して定数を import
- favicon はファイル規約（`src/app/icon.png`、削除）をやめ、`layout.tsx` の `metadata.icons` で定数を参照
- `route.ts` の webpush `icon` は定数を参照
- Service Worker はファイル名を持たず、サーバーが webpush ペイロードで送る icon URL（`payload.notification?.icon || payload.data?.icon`）を使う。icon が無い場合はブラウザ既定の表示にフォールバック

差し替え作業は「`public/icons/` に連番を上げた画像を追加 + 定数 1 行の変更」になった。

## Options Considered

### Option A: 4 箇所のまま手順書で運用（従来）

**Pros:** コード変更なし。各参照元がそれぞれの技術の素直な書き方のまま。
**Cons:** 差し替えのたびに 4 ファイルの書き換えが必要で、取りこぼしを仕組みで防げない。実際に 404 障害が起きた。

### Option B: 定数モジュール + ペイロード駆動の Service Worker（採用）

**Pros:** コード側の書き換えが 1 箇所になり、取りこぼしが構造的に起きない。SW からファイル名が消えるため、アイコン差し替えと SW 更新（ブラウザに強くキャッシュされる）が独立する。
**Cons:** `public/` 直下の素の JS は `src/` の定数を import できないため、SW だけ「ペイロード経由で受け取る」という間接的な形になる。manifest の配信 URL が `/manifest.json` から `/manifest.webmanifest` に変わる。

### Option C: ビルド時に SW へファイル名を埋め込む

ビルドスクリプトで `firebase-messaging-sw.js` を生成し、定数を文字列展開する案。
**Pros:** SW も定数を直接参照でき、ペイロードへの依存が無い。
**Cons:** 生成ステップが増え、`public/` の実ファイルとソースの二重管理になる。手書き SW を素朴に保つ方針（ADR-0010）に反する。リマインダー通知 1 種類のためには過剰。

### Option D: ファイル名を固定して上書き運用にする

**Pros:** 参照の書き換え自体が不要になる。
**Cons:** インストール済み端末が URL 単位でキャッシュするため更新が届かない。これが連番運用を採った理由そのもので、前提から成立しない。

## Trade-off Analysis

決め手は Option A で実際に障害が起きた実績。手順書は「気づける」ようにはするが「起きない」ようにはしない。Option B は参照の一貫性をコンパイラ（TS の import）とデータフロー（ペイロード）に載せ替え、人間の注意力への依存を外す。

引き換えに受け入れたのは SW の間接化で、サーバーが icon を送らないペイロード（現運用では存在しない）では通知アイコンが出なくなる。ただしその場合も通知自体は届き、表示が既定に落ちるだけなので、フォールバック必須の方針（ADR-0007 と同じ思想)として許容した。

## Consequences

- アイコン差し替えの手順が README の 7 ステップから 4 ステップに縮んだ。コード側の変更は `src/constants/icon.ts` の 1 行のみ。
- manifest の配信 URL が `/manifest.webmanifest` に変わった。`<link rel="manifest">` は Next.js が自動生成するため参照切れは起きず、旧 `/manifest.json` をキャッシュした端末もページ訪問時に link タグから再取得して追従する。
- favicon は `/icons/icon-512-2.png`（512px PNG）を直接指す。旧 `src/app/icon.png` も同一画像だったため実質変化はない。
- 連番運用そのもの（同名上書きしない・旧ファイルを消さない）は変わらない。理由は定数ファイルのコメントと README に記録した。
- `src/constants/` ディレクトリが新設された。今後、複数ファイルから参照される定数はここに置く。

## Action Items

1. [ ] デプロイ後、DevTools の Application > Manifest でアイコンが読めていることを確認する
2. [ ] 定時通知（12:00 / 18:00 JST）がアイコン付きで届くことを実機で確認する
3. [ ] 次回のアイコン差し替え時、定数 1 行 + 画像追加だけで全箇所が切り替わることを検証し、README の手順に不足があれば直す
