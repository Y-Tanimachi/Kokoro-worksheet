# ADR-0017: ワークシート記録のスキーマを Firestore ルールで検証する

**Status:** Accepted
**Date:** 2026-09-24
**Deciders:** Y-Tanimachi（単独開発）

## Context

`firestore.rules` は `users/{userId}/{document=**}` に対して「本人なら読み書き自由」としていた。他人のデータには触れないが、本人のデータには形式を問わず何でも書き込めた。

クライアントを経由せず（開発者ツールや SDK の直接呼び出しで）不正な形のデータが入ると、次のような壊れ方をする。

- `createdAt` が JST 壁時計形式（ADR-0004）でないと、文字列比較による通知判定や期間集計がずれる。不正な日付文字列は一覧・詳細の `format()` で RangeError になり、画面ごと落ちる。
- `emotions` が配列でないと、一覧・集計の `.map()` / `.forEach()` で落ちる。
- 項目の文字数に上限が無いので、入力欄の上限（ADR-0015）を迂回できる。

書き込めるのは本人のデータだけなので被害は本人に閉じるが、`user_settings` はすでにルールでスキーマを検証しており（多層防御）、記録だけ検証が無い状態だった。

## Decision

- 許可するパスを `users/{userId}/entries/{entryId}` に限定する。ルールは 1 つでも `allow` が当たれば通るため、配下を丸ごと許可するワイルドカードを残すと検証が効かない。アプリが使う `users` 配下のパスは entries だけなので、他は default deny にする。
- `create` / `update` で `WorksheetEntry` 型（`src/types/index.ts`）と同じ形かを検証する。
  - 必須キー 11 個と、任意の `aiMessage` 以外のキーを持たない
  - `id` がドキュメント ID と一致する
  - `createdAt` が `YYYY-MM-DDTHH:MM` 形式の文字列
  - `trigger` は 1 文字以上。テキスト 7 項目は文字列で 300 文字以下（`MAX_FIELD_LENGTH` と揃える）
  - `emotions` は 1 件以上の配列で、定義済みの 8 種類の感情だけを含む
  - `emotionStrength` は 1〜10 の数値
  - `aiMessage` は 200 文字以下の文字列（サーバーは 80 文字に切り詰めて返す）
- `read` と `delete` は本人なら無条件で許可する。

## Options Considered

### Option A: 従来どおり本人なら自由に書ける

**Pros:** ルールが単純。スキーマを変えてもルールの更新が要らない。
**Cons:** 不正な形のデータで画面が落ちる。`user_settings` との一貫性が無い。

### Option B: 型・形式・文字数まで検証する（採用）

**Pros:** 画面を落とす形のデータを入口で止められる。入力欄の上限を迂回されない。
**Cons:** `WorksheetEntry` の型や `MAX_FIELD_LENGTH` を変えるたびに、ルールも同時に直して反映する必要がある。ルールは TS を import できないので値を直書きしている。

### Option C: 型だけを検証し、文字数や形式は見ない

**Pros:** ルールとアプリの値を同期する手間が減る。
**Cons:** `createdAt` の形式崩れという、実際に起きたことのある不具合（`toISOString()` の混入）を防げない。

## Trade-off Analysis

守りたいのは「画面が落ちない」「日付の比較が崩れない」の 2 点で、どちらも型だけでは防げないため Option B にした。同期の手間は、定数側のコメントでルールの存在を示すことで補う。

## Consequences

- 不正な形の記録は保存時に `permission-denied` で拒否される。通常の画面操作で作られる記録はすべてこの検証を満たす。
- 既存の記録は、作成直後の AI メッセージ付与を除いて更新されないため、この検証の導入後も閲覧・削除はこれまでどおりできる。300 文字を超える項目や形式の古い `createdAt` を持つ既存記録も、そのまま読める。
- `WorksheetEntry` にフィールドを足すときは、`hasOnly` のキー一覧にも足さないと保存できなくなる。
- ルールは手動で反映している（`firebase.json` が無く、CLI での反映手順が未整備。ADR-0002 の Action Items）。リポジトリのファイルを変えただけでは本番に反映されない。
- エミュレーターが無いため、ルールの自動テストは無い（ADR-0011 の方針どおり）。

## Action Items

1. [ ] Firebase コンソールのルール Playground で、次を確認してから反映する
   - 300 文字の日本語を含む記録の create が通る（`string.size()` が文字数で数えることの確認）
   - `createdAt` が ISO 形式（`...Z` 付き）の create が拒否される
   - `aiMessage` を付けた update が通る
2. [ ] 反映後、実機で新規記録の作成（AI メッセージの付与まで）と削除ができることを確認する
