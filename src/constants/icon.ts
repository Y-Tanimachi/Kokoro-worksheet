// アプリアイコンの参照先を集約する唯一の定義元（issue #18）。
// 差し替え時はここの連番を上げ、public/icons/ に新しいファイルを「追加」する。
// 同名上書きにしないのは、インストール済み端末がアイコンを URL 単位で
// キャッシュしており、URL が変わらないと更新されないため。
// 旧ファイルは古いマニフェストをキャッシュした端末が参照しうるので消さない。
// 手順の詳細は README「アイコンの差し替え」を参照。
export const ICON_PATH = "/icons/icon-512-2.png";
export const MASKABLE_ICON_PATH = "/icons/icon-maskable-512-2.png";
