"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { saveEntry } from "@/utils/storage"
import { WorksheetEntry, Emotion } from "@/types"
import { Smile, Frown, Angry, Meh, Heart, Zap, HelpCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

const EMOTIONS: { label: Emotion; icon: React.ReactNode; color: string }[] = [
    { label: "怒り", icon: <Angry className="w-6 h-6" />, color: "bg-red-100 dark:bg-red-900 border-red-200" },
    { label: "悲しみ", icon: <Frown className="w-6 h-6" />, color: "bg-blue-100 dark:bg-blue-900 border-blue-200" },
    { label: "喜び", icon: <Smile className="w-6 h-6" />, color: "bg-yellow-100 dark:bg-yellow-900 border-yellow-200" },
    { label: "不安", icon: <HelpCircle className="w-6 h-6" />, color: "bg-purple-100 dark:bg-purple-900 border-purple-200" },
    { label: "疲労", icon: <Zap className="w-6 h-6" />, color: "bg-gray-100 dark:bg-gray-800 border-gray-200" },
    { label: "無力感", icon: <Meh className="w-6 h-6" />, color: "bg-indigo-100 dark:bg-indigo-900 border-indigo-200" },
    { label: "愛情", icon: <Heart className="w-6 h-6" />, color: "bg-pink-100 dark:bg-pink-900 border-pink-200" },
]

export function WorksheetForm() {
    const router = useRouter()
    const { user } = useAuth()
    const [step, setStep] = useState(1)
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState<Partial<WorksheetEntry>>({
        // JST (UTC+9) の日時をセット
        createdAt: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16),
        emotionStrength: 5,
        emotions: [],
    })

    const handleChange = (field: keyof WorksheetEntry, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleEmotionToggle = (emotion: Emotion) => {
        setFormData((prev) => {
            const current = prev.emotions || []
            const exists = current.includes(emotion)
            return {
                ...prev,
                emotions: exists
                    ? current.filter((e) => e !== emotion)
                    : [...current, emotion],
            }
        })
    }

    const handleNext = () => setStep(step + 1)
    const handleBack = () => setStep(step - 1)

    const handleSubmit = async () => {
        if (!formData.trigger || !formData.emotions?.length) {
            alert("必須項目を入力してください")
            return
        }

        if (!user) {
            alert("保存するにはログインが必要です")
            return
        }

        setIsSaving(true)

        try {
            const entry: WorksheetEntry = {
                id: crypto.randomUUID(),
                createdAt: formData.createdAt || new Date().toISOString(),
                trigger: formData.trigger || "",
                emotions: formData.emotions || [],
                emotionStrength: formData.emotionStrength || 5,
                automaticThought: formData.automaticThought || "",
                alternativeThought: formData.alternativeThought || "",
                reaction: formData.reaction || "",
                reflection: formData.reflection || "",
                nextStep: formData.nextStep || "",
                praise: formData.praise || "",
            }

            await saveEntry(user.uid, entry)
            // 完了メッセージ（自分を褒める）
            alert("お疲れ様でした！自分の感情に向き合えたあなたは素晴らしいです！")
            router.push("/")
        } catch (error) {
            console.error(error)
            alert("保存に失敗しました")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="max-w-md mx-auto p-4 space-y-6">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">Step {step} / 4</span>
                <div className="h-2 flex-1 ml-4 bg-secondary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(step / 4) * 100}%` }}
                    />
                </div>
            </div>

            <Card className="glass-card min-h-[400px] flex flex-col justify-between">
                <CardHeader>
                    <CardTitle>
                        {step === 1 && "まずは状況を整理"}
                        {step === 2 && "感情と向き合う"}
                        {step === 3 && "思考と行動"}
                        {step === 4 && "振り返りと感謝"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 flex-1">
                    {step === 1 && (
                        <>
                            <div className="space-y-2">
                                <Label>1. 日時</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.createdAt}
                                    onChange={(e) => handleChange("createdAt", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>2. 何が起こったか（トリガー）</Label>
                                <Textarea
                                    placeholder="例：3歳がイヤイヤで洗濯物を落とさない..."
                                    value={formData.trigger}
                                    onChange={(e) => handleChange("trigger", e.target.value)}
                                    className="min-h-[120px]"
                                />
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="space-y-2">
                                <Label>3. 感情（複数選択可）</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {EMOTIONS.map((e) => (
                                        <button
                                            key={e.label}
                                            onClick={() => handleEmotionToggle(e.label)}
                                            className={`p-3 rounded-xl border flex items-center space-x-2 transition-all ${formData.emotions?.includes(e.label)
                                                ? "ring-2 ring-primary bg-primary/10 border-primary"
                                                : "hover:bg-accent border-transparent bg-secondary/50"
                                                }`}
                                        >
                                            {e.icon}
                                            <span>{e.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <Label>4. 感情の強さ (1-10): {formData.emotionStrength}</Label>
                                <Slider
                                    value={[formData.emotionStrength || 5]}
                                    min={1}
                                    max={10}
                                    step={1}
                                    onValueChange={(val) => handleChange("emotionStrength", val[0])}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>弱い</span>
                                    <span>強い</span>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div className="space-y-2">
                                <Label>5. その時考えたこと（自動思考）</Label>
                                <Textarea
                                    placeholder="例：どうして子どもは私を無視するんだろう？"
                                    value={formData.automaticThought}
                                    onChange={(e) => handleChange("automaticThought", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>6. 別の考え方（代替思考）</Label>
                                <Textarea
                                    placeholder="例：子どもはまだ選択の方法を学んでいる..."
                                    value={formData.alternativeThought}
                                    onChange={(e) => handleChange("alternativeThought", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>7. とった行動（反応）</Label>
                                <Input
                                    placeholder="例：大声で叱った"
                                    value={formData.reaction}
                                    onChange={(e) => handleChange("reaction", e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <div className="space-y-2">
                                <Label>8. 学んだこと・反省</Label>
                                <Textarea
                                    placeholder="例：叱る前に一呼吸おけばよかった"
                                    value={formData.reflection}
                                    onChange={(e) => handleChange("reflection", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>9. 次に試すこと</Label>
                                <Input
                                    placeholder="例：小さな選択肢を与える"
                                    value={formData.nextStep}
                                    onChange={(e) => handleChange("nextStep", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-primary font-bold">10. 自分を褒める！</Label>
                                <Textarea
                                    placeholder="例：今日一日よく頑張った！"
                                    value={formData.praise}
                                    onChange={(e) => handleChange("praise", e.target.value)}
                                    className="bg-primary/5 border-primary/20"
                                />
                            </div>
                        </>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                    <Button variant="ghost" onClick={handleBack} disabled={step === 1}>
                        戻る
                    </Button>
                    {step < 4 ? (
                        <Button onClick={handleNext}>次へ</Button>
                    ) : (
                        <Button onClick={handleSubmit} className="w-32" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            完了記録
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
