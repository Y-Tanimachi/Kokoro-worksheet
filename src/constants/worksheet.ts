// ワークシートのテキスト項目（トリガー・自動思考など 7 項目）1 つあたりの最大文字数。
// 入力欄の maxLength と、AI メッセージ API の入力上限の算出の両方で使う。
// クライアントとサーバーで値がずれると、正規の入力が API で弾かれてしまうため 1 箇所で定義する。
// String.length（UTF-16 単位）で数えるため、日本語はほぼ 1 文字 = 1、絵文字などは 2 と数えられる。
// firestore.rules の isText() にも同じ値を直書きしている（ルールは TS を import できない）ため、変えるときは両方直すこと。
export const MAX_FIELD_LENGTH = 300;

// テキスト項目の数。AI に送る本文の上限を「項目数 × 1 項目の上限」から算出するために使う
export const TEXT_FIELD_COUNT = 7;

// 入力が上限のこの割合に達したら、残り文字数の警告を出す
export const FIELD_LENGTH_WARNING_RATIO = 0.8;
