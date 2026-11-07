import { CachedMonthlyAnalysis } from "@/components/workspace/cached-monthly-analysis"
export async function MonthlyAnalysisContent({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    return (
        <CachedMonthlyAnalysis
            accountId={(await params).id}
            query={await searchParams}
        />
    )
}
