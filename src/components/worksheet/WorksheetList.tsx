"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
// import { getEntries } from "@/utils/storage" // Removed
import { useWorksheetEntries } from "@/hooks/useWorksheetEntries"
import { WorksheetEntry } from "@/types"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

// ホーム画面に表示するワークシート一覧
// 未ログイン・空・ローディング の3状態をそれぞれ専用UIで表示する
export function WorksheetList() {
    const router = useRouter()
    const { user, loading: authLoading, signInWithGoogle } = useAuth()
    const { entries, isLoading } = useWorksheetEntries()

    if (authLoading || isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="text-center py-10 space-y-4">
                <h2 className="text-xl font-semibold">ログインが必要です</h2>
                <p className="text-muted-foreground">データを保存・閲覧するにはログインしてください。</p>
                <Button onClick={() => signInWithGoogle()}>
                    Googleでログイン
                </Button>
            </div>
        )
    }

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
                                {/* 感情タグは最大3つ表示し、4つ以上は "..." で省略 */}
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
