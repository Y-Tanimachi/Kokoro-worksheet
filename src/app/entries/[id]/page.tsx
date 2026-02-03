"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getEntries, deleteEntry } from "@/utils/storage"
import { WorksheetEntry } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { ArrowLeft, Trash2 } from "lucide-react"

export default function EntryDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [entry, setEntry] = useState<WorksheetEntry | null>(null)

    useEffect(() => {
        if (typeof id === "string") {
            const entries = getEntries()
            const found = entries.find((e) => e.id === id)
            setEntry(found || null)
        }
    }, [id])

    if (!entry) {
        return <div className="p-8 text-center">読み込み中...</div>
    }

    const handleDelete = () => {
        if (confirm("本当に削除しますか？")) {
            deleteEntry(entry.id)
            router.push("/")
        }
    }

    return (
        <div className="container max-w-md mx-auto py-6 px-4 space-y-6">
            <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 戻る
            </Button>

            <Card className="glass-card">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-muted-foreground">{format(new Date(entry.createdAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}</p>
                            <CardTitle className="mt-2 text-xl">{entry.trigger}</CardTitle>
                        </div>
                        <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center font-bold">
                            {entry.emotionStrength}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                        {entry.emotions.map((e) => (
                            <span key={e} className="px-2 py-1 bg-secondary rounded-md text-sm">
                                {e}
                            </span>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Section title="自動思考" content={entry.automaticThought} />
                    <Section title="代替思考" content={entry.alternativeThought} />
                    <Section title="反応" content={entry.reaction} />
                    <Section title="反省・学び" content={entry.reflection} />
                    <Section title="次に試すこと" content={entry.nextStep} />
                    <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <h4 className="text-sm font-bold text-primary mb-1">感謝・ポジティブメッセージ</h4>
                        <p>{entry.praise}</p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={handleDelete} className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> 削除する
                </Button>
            </div>
        </div>
    )
}

function Section({ title, content }: { title: string; content: string }) {
    if (!content) return null
    return (
        <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">{title}</h4>
            <p className="whitespace-pre-wrap">{content}</p>
        </div>
    )
}
