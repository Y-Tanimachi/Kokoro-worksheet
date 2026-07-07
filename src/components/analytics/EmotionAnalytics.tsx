"use client"

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getWeeklyStats, getMonthlyStats, getDominantEmotion, EmotionStat } from "@/utils/statistics";
import { useEntries } from "@/context/EntriesContext";
import { Loader2, TrendingUp } from "lucide-react";

type Period = "week" | "month";

// タブ（期間）ごとの表示文言
const PERIOD_LABELS: Record<Period, { title: string; description: string; empty: string }> = {
    week: {
        title: "今週の感情レポート",
        description: "一週間の感情の傾向と強度",
        empty: "今週のデータがまだありません",
    },
    month: {
        title: "今月の感情レポート",
        description: "一ヶ月の感情の傾向と強度",
        empty: "今月のデータがまだありません",
    },
};

// 「今一番強い感情」と「感情の内訳」バーの表示本体（週・月タブで共有）
function ReportBody({
    stats,
    dominantEmotion,
    emptyMessage,
}: {
    stats: EmotionStat[];
    dominantEmotion: EmotionStat | null;
    emptyMessage: string;
}) {
    return (
        <div className="space-y-6">
            {/* Dominant Emotion Section */}
            <div className="bg-primary/5 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">今一番強い感情</p>
                {dominantEmotion ? (
                    <div className="animate-in fade-in zoom-in duration-500">
                        <span className="text-3xl font-bold text-primary block mb-1">
                            {dominantEmotion.emotion}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            強度スコア: {dominantEmotion.score}
                        </span>
                    </div>
                ) : (
                    <p className="text-muted-foreground">データ不足</p>
                )}
            </div>

            {/* Breakdown Section */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">感情の内訳 (強度合計)</h4>
                <div className="space-y-2">
                    {stats.filter(s => s.score > 0).map((stat) => (
                        <div key={stat.emotion} className="flex items-center justify-between text-sm">
                            <span className="w-16 font-medium">{stat.emotion}</span>
                            <div className="flex-1 mx-3 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary/70 rounded-full"
                                    // バーの幅 = 各感情スコア ÷ 最大スコア（dominantEmotion）× 100%
                                    // dominantEmotionを基準にするため最大スコアのバーが必ず100%幅になる
                                    style={{ width: `${(stat.score / (dominantEmotion?.score || 1)) * 100}%` }}
                                />
                            </div>
                            <span className="w-8 text-right tabular-nums">{stat.score}</span>
                        </div>
                    ))}
                    {stats.every(s => s.score === 0) && (
                        <p className="text-xs text-center text-muted-foreground py-2">
                            {emptyMessage}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// 今週（月〜日）/ 今月（1日〜月末）の感情集計をタブで切り替えて表示するウィジェット
// 未ログイン・エントリなし・ローディング中はそれぞれ異なる表示を返す
export function EmotionAnalytics() {
    const { entries, isLoading, user } = useEntries();
    const [period, setPeriod] = useState<Period>("week");

    // entries が変化した時だけ統計を再計算（毎レンダリングの重複計算を避ける）
    // 週・月両方を先に計算しておくことでタブ切替が即時になる
    const { week, month } = useMemo(() => {
        if (!entries || entries.length === 0) {
            const emptyReport = { stats: [] as EmotionStat[], dominant: null };
            return { week: emptyReport, month: emptyReport };
        }
        const weeklyStats = getWeeklyStats(entries);
        const monthlyStats = getMonthlyStats(entries);
        return {
            week: { stats: weeklyStats, dominant: getDominantEmotion(weeklyStats) },
            month: { stats: monthlyStats, dominant: getDominantEmotion(monthlyStats) },
        };
    }, [entries]);

    if (isLoading) {
        return (
            <Card className="glass-card mb-6">
                <CardContent className="py-6 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    if (!user || entries.length === 0) {
        return null;
    }

    const labels = PERIOD_LABELS[period];

    return (
        <Card className="glass-card mb-6 border-primary/20">
            <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            {labels.title}
                        </CardTitle>
                        <TabsList>
                            <TabsTrigger value="week">今週</TabsTrigger>
                            <TabsTrigger value="month">今月</TabsTrigger>
                        </TabsList>
                    </div>
                    <CardDescription>
                        {labels.description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TabsContent value="week">
                        <ReportBody
                            stats={week.stats}
                            dominantEmotion={week.dominant}
                            emptyMessage={PERIOD_LABELS.week.empty}
                        />
                    </TabsContent>
                    <TabsContent value="month">
                        <ReportBody
                            stats={month.stats}
                            dominantEmotion={month.dominant}
                            emptyMessage={PERIOD_LABELS.month.empty}
                        />
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
}
