# ADR-0009: 通知バッチのスケジューラに GitHub Actions を使う

**Status:** Superseded by [ADR-0012](0012-vercel-cron.md)
**Date:** 2026-06-09（2026-07-25 / 07-26 に信頼性を修正 / 事後記録: 2026-08-03）
**Deciders:** Y-Tanimachi（単独開発）

## Context

その日の記録がないユーザーに、12:00 と 18:00（JST）にリマインダーのプッシュ通知を送りたい。通知の送信処理そのものは `POST /api/notifications/send` に実装済みで、必要なのは決まった時刻にこれを叩く仕組みだけ。

## Decision

GitHub Actions のスケジュール実行（`.github/workflows/send-notifications.yml`）から curl で API を叩く。

- cron は `0 3 * * *` と `0 9 * * *`（UTC）＝ 12:00 / 18:00 JST
- 認証は `CRON_SECRET` の Bearer トークン。API 側は `timingSafeEqual` で定数時間比較する
- `workflow_dispatch` を付けて手動実行できるようにする

## Options Considered

### Option A: GitHub Actions のスケジュール実行

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | パブリックリポジトリなら無料 |
| Scalability | 十分 |
| Team familiarity | High |

**Pros:** 設定がリポジトリの中にあり、差分がレビューできる。実行ログが GitHub に残る。手動実行がボタン 1 つ。Vercel のプラン制約を受けない。
**Cons:** 実行時刻が保証されない（GitHub の負荷次第で数分から数十分遅れる）。ランナーの共有 IP が外部からブロックされることがある。シークレットが Vercel と GitHub の 2 箇所に分散する。

### Option B: Vercel Cron

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | 無料プランは 1 日 1 回の制約あり |
| Scalability | 十分 |
| Team familiarity | Medium |

**Pros:** アプリと同じ環境から呼ばれるのでネットワーク経路の問題が起きない。認証をヘッダー共有シークレットで済ませられる。エッジのボット対策に引っかからない。
**Cons:** 無料プランでは 1 日 2 回のスケジュールが組めない。設定が `vercel.json` とダッシュボードに分かれる。

### Option C: Cloud Scheduler + Cloud Functions

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | ほぼ無料 |
| Scalability | 良い |
| Team familiarity | Low |

**Pros:** 実行時刻が正確。Firebase プロジェクトと同じ GCP 内で完結する。
**Cons:** 管理対象の環境が 1 つ増える。Firebase の課金プラン変更が必要。

## Trade-off Analysis

決め手は「1 日 2 回」だった。Vercel の無料プランでは 2 回のスケジュールが組めず、Option B は最初から選べなかった。

その結果、**アプリの外から HTTP でアプリを叩く**構成になり、経路上の問題を 2 回踏むことになった。

1. **308 リダイレクトの見逃し（2026-06-28 〜 07-25、約 1 か月）** — `APP_URL` の設定（`http://` や末尾スラッシュ）で 308 が返っていたが、curl の `--fail` 系オプションは 3xx を失敗にしないためジョブは緑のままだった。通知が止まっていることに気づけなかった。
2. **Vercel エッジによる 403（2026-06-25 と 07-26）** — GitHub Actions ランナーの共有 IP が Vercel のボット対策にブロックされた。Firewall の Allow ルールで一度対処したが、ダッシュボード操作で消えて再発した。

対策として次を入れている。

- ステータスコードを明示的に取り出し、**200 以外はすべて失敗**にして exit 1 する
- `x-vercel-protection-bypass` ヘッダー（Protection Bypass for Automation のシークレット）を送り、エッジの遮断をワークフロー側から確実にバイパスする
- `workflow_dispatch` で次の cron を待たずに動作確認できるようにする

## Consequences

- スケジュール設定がリポジトリにあり、変更履歴が追える。
- 実行時刻が正確ではない。GitHub の cron は遅延することがあり、12:00 / 18:00 ちょうどには届かない。リマインダーという性質上、数分から数十分のずれは許容している。
- シークレットが 2 箇所に分散する。GitHub Secrets 側に `APP_URL` / `CRON_SECRET` / `VERCEL_AUTOMATION_BYPASS_SECRET`、Vercel 側に `CRON_SECRET`。`CRON_SECRET` は両者で一致させる必要があり、片方だけ更新すると通知が止まる。
- `x-vercel-protection-bypass` は Vercel 固有の仕組み。他のホスティングに移すときはここが不要になる代わりに、別の経路問題が出る可能性がある。
- **サイレント故障の再発リスクが残る。** 現在の対策は「200 以外なら赤くする」までで、ワークフローが赤くなったことを能動的に知る仕組みは無い（GitHub のメール通知頼み）。
- 有料プランに移行するなら Option B（Vercel Cron）が構成として素直になる。**この ADR は再検討候補。**

## Action Items

1. [ ] ワークフロー失敗時の通知経路を確認する（GitHub の通知設定が有効か）
2. [ ] Vercel を有料プランにする機会があれば Option B への移行を検討する
3. [ ] `CRON_SECRET` を更新するときは GitHub と Vercel の両方を同時に更新する手順を README に書く
