"use client"

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getWeeklyStats, getDominantEmotion } from "@/utils/statistics";
import { useWorksheetEntries } from "@/hooks/useWorksheetEntries";
import { Loader2, TrendingUp } from "lucide-react";

export function WeeklyAnalytics() {
    const { entries, isLoading, user } = useWorksheetEntries();

    const { weeklyStats, dominantEmotion } = useMemo(() => {
        if (!entries || entries.length === 0) {
            return { weeklyStats: [], dominantEmotion: null };
        }
        const stats = getWeeklyStats(entries);
        const dominant = getDominantEmotion(stats);
        return { weeklyStats: stats, dominantEmotion: dominant };
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

    return (
        <Card className="glass-card mb-6 border-primary/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    今週の感情レポート
                </CardTitle>
                <CardDescription>
                    一週間の感情の傾向と強度
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                        {weeklyStats.filter(s => s.score > 0).map((stat) => (
                            <div key={stat.emotion} className="flex items-center justify-between text-sm">
                                <span className="w-16 font-medium">{stat.emotion}</span>
                                <div className="flex-1 mx-3 h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary/70 rounded-full"
                                        style={{ width: `${(stat.score / (dominantEmotion?.score || 1)) * 100}%` }}
                                    />
                                </div>
                                <span className="w-8 text-right tabular-nums">{stat.score}</span>
                            </div>
                        ))}
                        {weeklyStats.every(s => s.score === 0) && (
                            <p className="text-xs text-center text-muted-foreground py-2">
                                今週のデータがまだありません
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
