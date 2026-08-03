# ADR-0007: 応援メッセージは Gemini で生成し、失敗時は必ず定型文を返す

**Status:** Accepted
**Date:** 2026-02-04（2026-06-24 モデル移行 / 2026-07-07 思考トークン対応 / 事後記録: 2026-08-03）
**Deciders:** Y-Tanimachi（単独開発）

## Context

ワークシートを保存すると、記入内容をふまえた 40〜70 字の応援メッセージを表示する。これはアプリの体験の中心にある機能だが、**記録を保存すること自体より重要ではない**。

外部の生成 AI API は落ちる。モデルは提供終了する。安全フィルタが応答をブロックすることもある。これらが起きたときに、ユーザーの記録が保存できなくなるのは許容できない。

## Decision

`@google/genai`（統合 SDK）経由で Gemini を呼ぶ。モデルは `gemini-2.5-flash`（`src/app/api/ai-message/route.ts` の `MODEL_NAME`）。

そのうえで、**どんな失敗でも HTTP 200 と定型文（`FALLBACK_MESSAGE`）を返す**。クライアントの保存フローを止めない。フォールバックに落ちるケースは次のとおり。

| ケース | 応答 |
|---|---|
| API 例外（ネットワーク、モデル提供終了、キー不正） | 200 + 定型文 + `isFallback: true` |
| 応答が空（安全フィルタによるブロックなど） | 200 + 定型文 + `isFallback: true` |
| `finishReason: MAX_TOKENS`（途中で切れた） | 200 + 定型文 + `isFallback: true` |
| レートリミット超過 | 429 + `fallback` フィールドに定型文（[ADR-0008](0008-ai-endpoint-protection.md)） |

失敗を握りつぶすとサイレント故障になるため、`catch` の中で HTTP ステータス別にログを分けて出す（404 はモデル提供終了、401/403 は API キー不正）。

出力の制御は 3 段構えにする。システムプロンプトで 40〜70 字を指示し、`thinkingConfig: { thinkingBudget: 0 }` で思考トークンを無効化し、最後にサーバー側で 80 字に切り捨てる。

## Options Considered

### Option A: 失敗時に必ず定型文を返す（可用性優先）

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | — |
| Scalability | — |
| Team familiarity | High |

**Pros:** AI がどう壊れても記録は保存できる。クライアント側にエラーハンドリングの分岐が要らない。
**Cons:** 壊れていることに気づきにくい。「毎回同じ定型文が出る」状態がしばらく放置される。

### Option B: エラーを返してクライアントに再試行させる

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | — |
| Scalability | — |
| Team familiarity | High |

**Pros:** 障害が可視化される。一時的な失敗はリトライで回復する。
**Cons:** 保存フローが AI の可用性に依存する。感情を書き終えた直後にエラーを見せる体験が悪い。

### Option C: メッセージ生成を非同期にする（保存後にバックグラウンドで付与）

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Cost | 追加のジョブ基盤が必要 |
| Scalability | 良い |
| Team familiarity | Low |

**Pros:** 保存と生成が完全に分離する。
**Cons:** ジョブ基盤が要る。書き終えた直後にメッセージを見せるという体験が失われる。

## Trade-off Analysis

この機能の位置づけがそのまま答えになった。ユーザーが失いたくないのは記録であって、応援メッセージは無くても記録は成立する。だから AI の障害を記録の保存に伝播させない。

Option A の弱点（故障に気づきにくい）は実際に踏んだ。旧 `gemini-2.0-flash` が 2026-06-01 に提供終了し、以後ずっと定型文が返り続けた。これに気づいたのが 2026-06-24。対策としてエラーログをステータス別に分け、404 のときは「`MODEL_NAME` の見直しが必要」と明示的に警告を出すようにした。

## Consequences

- 保存フローが AI の可用性から切り離されている。
- 障害が UI に出ないので、ログを見ないと気づけない。Vercel のログを定期的に見るか、`isFallback` の発生率を監視する仕組みが要る（未実装）。
- モデルの提供終了に追随する運用が必要。`MODEL_NAME` は定数 1 箇所にまとまっているので変更自体は容易。
- Gemini 2.5 系は思考がデフォルトで有効で、思考トークンが `maxOutputTokens` の予算を食う。これを知らずに上限を絞ると本文が数十字で切れる（2026-07-07 に発生）。`thinkingBudget: 0` と `maxOutputTokens: 1024` の組み合わせはこの問題への対処であり、モデルを変えるときは再確認が必要。
- プロンプトインジェクション対策として、システムプロンプトに指示変更の拒否を明記し、ユーザー入力を `###` デリミタで囲んでいる。完全な防御ではなく緩和策。

## Action Items

1. [ ] `isFallback: true` の発生率を監視する仕組みを入れる（Vercel のログ検索でもよい）
2. [ ] モデル変更時は `thinkingConfig` と `maxOutputTokens` の挙動を再確認する
