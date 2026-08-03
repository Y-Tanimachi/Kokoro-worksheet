# ADR-0010: PWA と Service Worker をライブラリなしで手書きする

**Status:** Accepted
**Date:** 2026-02-03（manifest）/ 2026-06-09（Service Worker）（事後記録: 2026-08-03）
**Deciders:** Y-Tanimachi（単独開発）

## Context

PWA 化の目的は 2 つある。

- スマホのホーム画面に追加してアプリらしく開けるようにする
- Web Push を受け取る（iOS Safari では PWA としてインストールされていないと Web Push が使えない）

一方でオフライン閲覧は要件に入っていない。記録の閲覧も作成も Firestore への通信が前提で、オフライン対応するなら[ADR-0003](0003-fetch-all-entries-client-filter.md)のデータ取得方針から作り直すことになる。

## Decision

`next-pwa` や Workbox を導入せず、必要最小限を手書きする。

- **マニフェスト** — `src/app/manifest.json`（App Router が `/manifest.json` として配信する）。`display: standalone`、512px のアイコン 2 種（`any` と `maskable`）
- **Service Worker** — `public/firebase-messaging-sw.js` の 1 ファイルのみ。FCM のバックグラウンド受信（`onBackgroundMessage`）だけを担当する
- Service Worker は ESM 非対応環境で動くため、Firebase の compat SDK を CDN から `importScripts()` で読み込む
- 登録は通知の許可を求めるタイミングで行う（`src/utils/notifications.ts` の `requestNotificationPermission()`）

**オフラインキャッシュは実装しない。**

## Options Considered

### Option A: 手書き（FCM 受信専用の Service Worker のみ）

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | 依存追加なし |
| Scalability | 機能を足すなら書き足しが要る |
| Team familiarity | Medium |

**Pros:** Service Worker の中身が 26 行で全部読める。ビルド設定に手を入れなくてよい。キャッシュ戦略の事故（古い JS が配信され続ける類）が起きない。
**Cons:** オフライン対応が要るようになったら自分で書くことになる。Firebase のバージョンを手で同期する必要がある。

### Option B: `next-pwa` / Serwist を導入する

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | 依存 1 つ + ビルド設定 |
| Scalability | 良い |
| Team familiarity | Low |

**Pros:** プリキャッシュとオフライン対応が設定だけで手に入る。
**Cons:** FCM の Service Worker と統合する手順が要る（Service Worker は 1 スコープに 1 つ）。オフライン要件が無い状態では機能が丸ごと余る。キャッシュ戦略を誤ると更新が反映されない不具合を生む。

## Trade-off Analysis

Service Worker に求めているのが FCM のバックグラウンド受信だけなので、そこにビルドツールを持ち込む理由がなかった。`next-pwa` を入れると FCM 用の Service Worker と統合する作業が発生し、得られるオフライン機能は使わない。

判断の前提は「オフライン閲覧が要件に入っていない」こと。ここが変わればこの ADR は見直しになる。

## Consequences

- Service Worker がビルド対象外の静的ファイルとして `public/` にある。TypeScript の型チェックも lint も効かない。
- **Firebase のバージョンを 2 箇所で手動同期する必要がある。** `public/firebase-messaging-sw.js` の `importScripts` の URL（現在 12.8.0）と、`package.json` の `firebase`（現在 12.8.0）。`npm update` で片方だけ上がるとズレる。
- Firebase のクライアント設定が `src/utils/firebase.ts` と Service Worker の 2 箇所に重複している（どちらも公開可能な値なので秘匿性の問題はないが、変更時は両方直す）。
- オフラインでは何も表示できない。ホーム画面から開いても通信できなければ白紙になる。
- **アイコンの配置漏れが実際に起きた。** 2026-06-09 のアイコン変更（`438f97f`）で、新しい画像を `src/app/icon-2.png` に追加して `manifest.json` の参照を `/icons/icon-512-2.png` に書き換えたが、`public/icons/` への配置が漏れていた。マニフェストのアイコンが約 2 か月にわたって 404 になっていた（2026-08-03 に修正）。アイコンの実体が `src/app/` と `public/icons/` の 2 箇所に分かれていて、参照が解決するかを検証する仕組みが無いことが原因。
- 同じ理由で、通知アイコンと favicon も 2026-06-09 以前の旧画像のまま取り残されていた（2026-08-03 に現行アイコンへ統一）。アイコンの参照が **manifest / Service Worker / 通知 API / favicon の 4 箇所**に散らばっており、1 箇所だけ直しても気づけない構造になっている。
- **アイコンを差し替えるときはファイル名ごと変える運用にしている。** インストール済み端末はアイコンを URL 単位でキャッシュするため、同じ名前に上書きしても更新されない。現行の名前は `icon-512-2.png` / `icon-maskable-512-2.png` で、次に差し替えるときは `-3` を付けて 4 箇所すべてを更新する。旧ファイル（`icon-512.png` / `icon-maskable-512.png`）は、古いマニフェストをキャッシュしているクライアントのために残してある。
- Next.js の app icon 規約が認識するのは `icon.png` と `icon1.png` のような**数字**サフィックスのみで、`icon-2.png` のようなハイフン付きは対象外。2026-06-09 に `src/app/icon-2.png` として置かれた新アイコンは配信されておらず、favicon は旧画像のままだった。同様に `icon-maskable*.png` も規約に無く配信されない（maskable は manifest 側の概念）。これらの死蔵ファイルは 2026-08-03 に削除した。

## Action Items

1. [x] `manifest.json` のアイコンパスと `public/icons/` の実ファイル名の不一致を直す（2026-08-03 完了）
2. [x] 通知アイコンと favicon を現行のアイコンに揃える（2026-08-03 完了）
3. [ ] アイコン差し替え手順（4 箇所の同時更新と連番の付け方）を README に書く
4. [ ] `firebase` を更新するときは Service Worker の `importScripts` の URL も合わせて更新する（手順を README に追記）
5. [ ] オフライン閲覧の要件が出てきたら Option B を再検討する
