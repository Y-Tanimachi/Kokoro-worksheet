// JST(+9h)固定で datetime-local 形式（YYYY-MM-DDTHH:MM）の文字列を扱う純粋関数群。
//
// entries.createdAt はこの形式（タイムゾーン無し・JSTの壁時計時刻）で保存される。
// そのため日付境界の比較や新規作成時の初期値も、必ず同じ形式で組み立てて
// 文字列の辞書順比較が破綻しないようにする。
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 指定時刻（省略時は現在）を JST の datetime-local 形式（分精度）で返す。
// 例: 2026-07-07T00:00:00Z → "2026-07-07T09:00"
export function toDatetimeLocalJST(date: Date = new Date()): string {
    return new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 16);
}

// 指定時刻が属する JST 日付の 00:00（その日の開始）を datetime-local 形式で返す。
// entries.createdAt との比較に使う下限値。
// 例: 2026-07-07T02:00:00Z → "2026-07-07T00:00"
export function getTodayStartJST(now: Date = new Date()): string {
    return `${toDatetimeLocalJST(now).slice(0, 10)}T00:00`;
}
