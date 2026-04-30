// CBT（認知行動療法）ワークシートで扱う感情の種類
export type Emotion = "怒り" | "悲しみ" | "喜び" | "不安" | "疲労" | "無力感" | "愛情" | "その他";

// 1件のワークシート記録。Firestoreの users/{userId}/entries/{id} に保存される
export interface WorksheetEntry {
    id: string;
    createdAt: string; // ISO string（JSTオフセット済みで保存）
    trigger: string;          // ステップ1: 何が起こったか（きっかけ）
    emotions: Emotion[];      // ステップ2: 感じた感情（複数選択可）
    emotionStrength: number;  // ステップ2: 感情の強さ 1〜10
    automaticThought: string; // ステップ3: その時とっさに浮かんだ考え（自動思考）
    alternativeThought: string; // ステップ3: 別の視点からの考え方（代替思考）
    reaction: string;         // ステップ3: 実際にとった行動
    reflection: string;       // ステップ4: 振り返り・学び
    nextStep: string;         // ステップ4: 次に試すこと
    praise: string;           // ステップ4: 自分への褒め言葉
    aiMessage?: string;       // 保存後にGemini APIが生成した応援メッセージ（オプション）
}
