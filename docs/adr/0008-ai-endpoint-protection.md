# ADR-0008: AI エンドポイントを ID トークン検証と Firestore トランザクションによるレートリミットで保護する

**Status:** Accepted
**Date:** 2026-02-05（2026-05-30 に競合状態を修正 / 事後記録: 2026-08-03）
**Deciders:** Y-Tanimachi（単独開発）

## Context

`POST /api/ai-message` は認証なしでも呼べる状態だと、そのまま Gemini API の請求につながる。URL さえ分かれば誰でも叩けるので、放置するとコスト枯渇攻撃の的になる。

個人アプリなので、そのために有料のレートリミットサービスを契約したくはない。

## Decision

3 段階で保護する。

1. **認証** — Firebase ID トークンを `Authorization: Bearer` で受け取り、Admin SDK の `verifyIdToken()` で検証する。ユーザー ID はトークンから取り、リクエストボディからは取らない。
2. **レートリミット** — `user_limits/{uid}` にカウンターを持ち、1 時間 20 回 / 1 日 100 回で制限する。読み取り・判定・書き込みを Firestore のトランザクションで原子化する。
3. **入力バリデーション** — `userInput` が文字列であること、空でないこと、2000 字以内であることを検証する。

`user_limits` は Firestore ルールで `allow read, write: if false` にし、クライアントからの直接操作を全面的に禁止する。書き換えられるのは Admin SDK（＝このエンドポイント）だけになる。

## Options Considered

### Option A: Firestore トランザクションでカウンターを管理する

| Dimension | Assessment |
|---|---|
| Complexity | Low〜Medium |
| Cost | リクエストごとに読み書き 1 往復 |
| Scalability | 個人利用の規模では十分 |
| Team familiarity | High |

**Pros:** 追加のインフラが要らない。既に使っている Firestore で完結する。カウンターが永続化されるのでサーバーの再起動やスケールアウトの影響を受けない。
**Cons:** AI 呼び出しのたびに Firestore の読み書きが増える。レイテンシがわずかに増える。

### Option B: Upstash Redis などの外部レートリミッタ

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | 無料枠はあるがサービスが 1 つ増える |
| Scalability | 良い |
| Team familiarity | Low |

**Pros:** レートリミット専用に作られていて速い。スライディングウィンドウなども簡単。
**Cons:** 管理対象のサービスと環境変数が増える（[ADR-0001](0001-nextjs-app-router-vercel.md) の方針に反する）。

### Option C: メモリ上のカウンターだけで済ませる

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | ゼロ |
| Scalability | 機能しない |
| Team familiarity | High |

**Pros:** 実装が最も簡単。
**Cons:** Vercel の Serverless はインスタンスが使い捨てなので、カウンターが保持されない。実質的に無防備。

## Trade-off Analysis

Option C は Serverless 環境では成立しない。Option B は確実だが、この規模では管理対象を増やすコストが上回る。Option A のオーバーヘッド（リクエストあたり Firestore 1 往復）は、後段の Gemini 呼び出しの数百 ms に比べれば無視できる。

当初の実装は「読み取り → 判定 → 書き込み」を素直に順番に書いていたため、同一ユーザーの並行リクエストが同じカウンタ値を読んで上限をすり抜けられた。2026-05-30 にトランザクションで原子化して修正している。レートリミットは競合状態があると意味を失うので、ここは省略できない。

## Consequences

- 追加インフラなしでコスト上限が効いている。
- AI 呼び出しごとに Firestore の読み書きが 1 往復増える。
- レートリミット超過時は 429 を返すが、ボディに定型文（`fallback`）も含めてクライアントが体験を落とさずに済むようにしている（[ADR-0007](0007-gemini-with-mandatory-fallback.md)）。
- 上限値（時 20 / 日 100）はコード内の定数。変更にはデプロイが要る。
- 入力長の上限は 2000 字。当初 500 字にしていたが、クライアントが 9 項目分のワークシート全文とラベルを連結して送るため、記入量の多いユーザーが常に弾かれて毎回フォールバックになっていた。実際の送信サイズを見て緩和した経緯がある。
- カウンターのリセットは「最終リセットから 1 時間 / 24 時間経過」の判定で行う固定ウィンドウ方式。ウィンドウ境界をまたぐと短時間に上限の 2 倍まで通る。個人利用では許容範囲。

## Action Items

1. [ ] 上限値を環境変数に出すか検討する（現状はコード定数）
2. [ ] `/api/notifications/send` 側の保護（`CRON_SECRET` の定数時間比較）と方針を揃えて文書化する
