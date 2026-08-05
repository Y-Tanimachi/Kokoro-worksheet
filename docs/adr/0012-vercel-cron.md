# ADR-0012: 通知バッチのスケジューラを Vercel Cron に切り替える

**Status:** Accepted（Supersedes [ADR-0009](0009-github-actions-cron.md)）
**Date:** 2026-08-05
**Deciders:** Y-Tanimachi（単独開発）

## Context

ADR-0009 で採用した GitHub Actions のクロンは、**アプリの外から HTTP でアプリを叩く**構成であるがゆえの経路問題を繰り返し起こした。

1. **308 リダイレクトの見逃し**（2026-06-28〜07-25、約1か月の通知停止）
2. **Vercel エッジによる 403**（2026-06-25 / 07-26 の2回。Firewall の Allow ルールはダッシュボード操作で消えて再発）

07-26 の再発以降も発動が安定せず、対症療法（`x-vercel-protection-bypass` ヘッダー、200 以外を失敗扱い）を重ねる状態が続いていた。

ADR-0009 で Vercel Cron（Option B）を却下した理由は「無料プランでは1日2回のスケジュールが組めない」だったが、これは正確ではなかった。Hobby プランの制約は「**クロン1本につき**1日1回まで」であり、クロン自体はプロジェクトあたり100本まで登録できる（[公式ドキュメント](https://vercel.com/docs/cron-jobs/usage-and-pricing)、2026-08-05 確認）。12:00 と 18:00 を**別々のクロンとして2本登録**すれば、無料のまま1日2回の通知が実現できる。

## Decision

`vercel.json` の `crons` に2本のクロンを登録し、Vercel Cron から `/api/notifications/send` を呼ぶ。GitHub Actions のワークフローは削除する。

- cron は `0 3 * * *` と `0 9 * * *`（Vercel Cron のタイムゾーンは常に UTC）＝ 12:00 / 18:00 JST
- Vercel Cron は **GET** リクエストで呼ぶため、route に GET ハンドラーを追加（処理は POST と共通）
- 認証は従来どおり `CRON_SECRET` の Bearer トークン + `timingSafeEqual`。Vercel は環境変数 `CRON_SECRET` を `Authorization: Bearer` ヘッダーとして**自動付与**するため、API 側の検証ロジックは無変更で流用できる
- 手動実行は curl の POST（または GET）で従来どおり可能

## Options Considered

### Option A: GitHub Actions を修理して続投

**Pros:** 変更が最小。手動実行ボタンがある。
**Cons:** 403 / リダイレクトなど経路問題の根本原因（外部からエッジ越しに叩く構成）が残る。シークレットが GitHub と Vercel の2箇所に分散し続ける。

### Option B: Vercel Cron（採用）

**Pros:** Vercel 内部からの呼び出しなのでエッジのボット対策・Firewall・リダイレクトの経路問題が構造的に消える。`APP_URL` / `VERCEL_AUTOMATION_BYPASS_SECRET` / GitHub Secrets が不要になり、シークレットは Vercel の `CRON_SECRET` 1箇所に集約される。設定が `vercel.json` としてリポジトリに残る。
**Cons:** Hobby プランは実行時刻の精度が「指定時刻から59分以内」（12:00 指定なら 12:00〜12:59 のどこかで発火）。失敗時のリトライは無い。GitHub Actions のような手動実行ボタンは無い（curl で代替）。

### Option C: Cloud Scheduler + Cloud Functions

ADR-0009 と同評価。実行時刻は正確だが、管理環境が増え Firebase の課金プラン変更も必要。リマインダー用途に対して過剰。

## Trade-off Analysis

決め手は **障害の根本原因の除去**。過去2種類の障害はどちらも「外部ランナー → Vercel エッジ → 関数」という経路上で起きており、Vercel Cron はこの経路自体を無くす。

引き換えに失うのは実行時刻の精度（±59分）だが、GitHub Actions のクロンも元々数分〜数十分遅れており（ADR-0009 Consequences）、リマインダーという用途では許容済みのトレードオフ。

## Consequences

- スケジュール設定が `vercel.json` としてリポジトリに残り、差分レビューできる（GitHub Actions 時代と同等）。
- GitHub Secrets（`APP_URL` / `CRON_SECRET` / `VERCEL_AUTOMATION_BYPASS_SECRET`）は不要になった。**`CRON_SECRET` の設定箇所は Vercel ダッシュボード1箇所のみ**になり、「片方だけ更新して通知が止まる」リスクが消えた。
- 実行ログは Vercel ダッシュボードの Cron Jobs / Runtime Logs で確認する（GitHub Actions のログは無くなる）。
- 失敗時のリトライは無く、配送はベストエフォート（稀に欠落・重複があり得る）。本ジョブは「今日の記録が無ければ送る」という状態確認型なので、重複実行しても同じ通知が2回届くだけで、データ破壊は起きない。
- クロンの有効化はデプロイに紐づく。`vercel.json` を変更したら本番デプロイで反映される。Instant Rollback ではクロン設定は巻き戻らない点に注意。
- 手動実行ボタン（workflow_dispatch 相当)は無い。動作確認は `curl -X POST https://<APP_URL>/api/notifications/send -H "Authorization: Bearer <CRON_SECRET>"` で行う。

## Action Items

1. [ ] Vercel ダッシュボードで `CRON_SECRET` が Production 環境変数に設定されていることを確認する（GitHub Secrets 側と同じ値なら変更不要）
2. [ ] デプロイ後、Vercel ダッシュボードの Settings > Cron Jobs にクロン2本が表示されることを確認する
3. [ ] 初回のクロン発火（12:00〜12:59 JST）後に Runtime Logs で 200 応答を確認する
4. [ ] GitHub リポジトリの Secrets（`APP_URL` / `VERCEL_AUTOMATION_BYPASS_SECRET`）は不要になったので削除する
