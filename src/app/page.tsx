import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WorksheetList } from "@/components/worksheet/WorksheetList"
import { WeeklyAnalytics } from "@/components/analytics/WeeklyAnalytics"
import { Plus } from "lucide-react"

export default function Home() {
  return (
    <div className="container max-w-md mx-auto py-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ワークシート履歴</h1>
        <Button asChild size="sm">
          <Link href="/new">
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Link>
        </Button>
      </div>

      <WeeklyAnalytics />
      <WorksheetList />
    </div>
  )
}
