# ADR-0002: バックエンドを Firebase（Auth / Firestore / FCM）に寄せる

**Status:** Accepted
**Date:** 2026-02-03（事後記録: 2026-08-03）
**Deciders:** Y-Tanimachi（単独開発）

## Context

必要なバックエンド機能は 3 つある。ログイン、ワークシートの保存、プッシュ通知。ユーザーは自分ひとりか、ごく少数を想定している。

サーバーを常時起動させる規模ではないし、DB のバックアップやマイグレーションに時間を割きたくない。一方でデータは感情の記録という私的な内容なので、ユーザーごとのアクセス制御は確実に効かせたい。

## Decision

Firebase を BaaS として採用し、この 3 機能をすべて寄せる。

- 認証: Firebase Auth の Google ポップアップログイン
- DB: Cloud Firestore
- 通知: Firebase Cloud Messaging（Web Push / VAPID）

クライアントからは Firebase JS SDK（`firebase`）で直接 Firestore を読み書きする。API サーバーを経由しない。アクセス制御は Firestore セキュリティルール（`firestore.rules`）で行う。

サーバー側の特権操作（AI のレートリミット、通知送信）だけ Firebase Admin SDK（`firebase-admin`）を使い、`src/utils/firebase-admin.ts` に閉じ込める。

## Options Considered

### Option A: Firebase

| Dimension | Assessment |
|---|---|
| Complexity | Low（サーバー実装が不要） |
| Cost | 無料枠で収まる |
| Scalability | 個人利用の規模では十分 |
| Team familiarity | High |

**Pros:** 認証・DB・プッシュ通知が 1 つのプロジェクトに揃う。FCM を使うなら Auth と Firestore も同じ Firebase にある方が圧倒的に楽。クライアント SDK から直接読み書きでき、CRUD のための API を書かなくてよい。
**Cons:** クエリ表現力が弱い（結合なし、集計が貧弱）。セキュリティ境界がルールファイルに集中し、ここを間違えると全部漏れる。ローカル開発でエミュレータを立てないと本番データに触ってしまう。

### Option B: Supabase（Postgres + Auth）

| Dimension | Assessment |
|---|---|
| Complexity | Low〜Medium |
| Cost | 無料枠で収まる |
| Scalability | 十分 |
| Team familiarity | Low |

**Pros:** SQL が使えるので期間集計をサーバー側に寄せられる。RLS による行レベル制御。
**Cons:** Web Push を別途用意することになる。FCM 相当の仕組みが標準では無く、通知だけ別サービスになる。

### Option C: 自前（Postgres + NextAuth + 自前 Web Push）

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Cost | DB のホスティング費用が発生 |
| Scalability | 十分 |
| Team familiarity | Medium |

**Pros:** 制約がない。データの持ち方を自由に決められる。
**Cons:** 個人アプリに対して運用負荷が見合わない。

## Trade-off Analysis

決め手は通知だった。Web Push を自前で組むより FCM を使う方が確実に早く、FCM を使うなら Firebase プロジェクトが必要になる。そこまで決まれば Auth と Firestore も同じ場所に置くのが自然だった。

Firestore のクエリの弱さは、集計をクライアント側に寄せることで回避している（[ADR-0003](0003-fetch-all-entries-client-filter.md)）。個人利用の記録件数では、この割り切りが成立する。

## Consequences

- CRUD のための API を書かずに済んでいる。`src/utils/storage.ts` がクライアント SDK を直接叩く 4 関数だけで完結している。
- セキュリティ境界が `firestore.rules` の 1 ファイルに集中する。ここは実際に 2 回強化している（2026-03-29 のルール強化、2026-07-07 の `user_settings` スキーマ検証）。コレクションごとの方針は次のとおり。
  - `users/{uid}/**` — 本人のみ読み書き
  - `user_settings/{uid}` — 本人のみ、かつフィールドの型を検証。クロンは Admin SDK でルールをバイパス
  - `user_limits/{uid}` — クライアントからは読み書き全面禁止（[ADR-0008](0008-ai-endpoint-protection.md)）
- `firestore.rules` はコミットされているが、デプロイ手順がリポジトリに無い。反映は Firebase コンソール側の手作業に依存しており、ファイルと本番の乖離を検知できない。
- Firebase のクライアント設定（`apiKey` など公開して問題ない値）は `src/utils/firebase.ts` にハードコードしている。環境変数にしていないため、別プロジェクトへの切り替えにはコード変更が要る。
- Admin SDK の秘密鍵を環境変数で運ぶ必要がある。`FIREBASE_PRIVATE_KEY` は改行を `\n` リテラルにした 1 行文字列で渡す約束になっており、形式を間違えるとビルドが `DECODER routines::unsupported` で落ちる。この落とし穴は README と CLAUDE.md に記載済み。
- Firestore エミュレータを使っていないため、ローカル開発が本番データを触る。

## Action Items

1. [ ] `firestore.rules` のデプロイを手順化する（Firebase CLI のコマンドを README に書くか、CI で流す）
2. [ ] ローカル開発で Firestore エミュレータを使うか、少なくとも開発用プロジェクトを分けるか決める
