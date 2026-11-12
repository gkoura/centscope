import { CachedOverviewBalanceHistory } from "@/components/workspace/cached-overview"
import {
    CachedAnalyticsMonthlyTrends,
    CachedAnalyticsCategoryHistory,
    CachedAnalyticsBudgetHistory,
} from "@/components/workspace/cached-analytics"

type Props = { params: Promise<{ id: string }> }
export async function AnalyticsBalanceHistory({ params }: Props) {
    return <CachedOverviewBalanceHistory accountId={(await params).id} />
}
export async function AnalyticsMonthlyTrends({ params }: Props) {
    return <CachedAnalyticsMonthlyTrends accountId={(await params).id} />
}

export async function AnalyticsCategoryHistory({ params }: Props) {
    return <CachedAnalyticsCategoryHistory accountId={(await params).id} />
}
export async function AnalyticsBudgetHistory({ params }: Props) {
    return <CachedAnalyticsBudgetHistory accountId={(await params).id} />
}
