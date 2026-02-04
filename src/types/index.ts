export type Emotion = "怒り" | "悲しみ" | "喜び" | "不安" | "疲労" | "無力感" | "愛情" | "その他";

export interface WorksheetEntry {
    id: string;
    createdAt: string; // ISO string
    trigger: string;
    emotions: Emotion[];
    emotionStrength: number; // 1-10
    automaticThought: string;
    alternativeThought: string;
    reaction: string;
    reflection: string;
    nextStep: string;
    praise: string;
    aiMessage?: string;
}
