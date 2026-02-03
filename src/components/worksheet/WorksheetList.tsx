"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getEntries } from "@/utils/storage"
import { WorksheetEntry } from "@/types"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function WorksheetList() {
    const [entries, setEntries] = useState<WorksheetEntry[]>([])
    const router = useRouter()

    useEffect(() => {
        setEntries(getEntries())
    }, [])

    if (entries.length === 0) {
        return (
            <div className="text-center py-10 space-y-4">
                <h2 className="text-xl font-semibold">まだ記録がありません</h2>
                <p className="text-muted-foreground">新しいワークシートを作成してみましょう。</p>
                <Button onClick={() => router.push("/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    新規作成
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {entries.map((entry) => (
                <Card key={entry.id} className="glass-card hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/entries/${entry.id}`)}>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-base font-medium line-clamp-1">
                                    {entry.trigger}
                                </CardTitle>
                                <CardDescription>
                                    {format(new Date(entry.createdAt), "yyyy年MM月dd日 HH:mm", { locale: ja })}
                                </CardDescription>
                            </div>
                            <div className="flex space-x-1">
                                {entry.emotions.slice(0, 3).map((e) => (
                                    <span key={e} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                                        {e}
                                    </span>
                                ))}
                                {entry.emotions.length > 3 && <span className="text-xs px-2 py-1 text-muted-foreground">...</span>}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            思考: {entry.automaticThought}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
