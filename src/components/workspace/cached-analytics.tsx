"use client"
import dynamic from "next/dynamic"
import { SectionLoading } from "@/components/site/section-loading"
import { useWorkspaceDay } from "./use-workspace-query"

const MonthlyComparison = dynamic(
    () =>
        import("./monthly-comparison").then(
            (module) => module.MonthlyComparison
        ),
    {
        loading: () => <SectionLoading label="Loading monthly trends…" />,
    }
)
export function CachedAnalyticsMonthlyTrends({
    accountId,
}: {
    accountId: string
}) {
    const today = useWorkspaceDay()
    if (!today) return <SectionLoading label="Loading monthly trends…" />
    return (
        <MonthlyComparison
            key={accountId}
            accountId={accountId}
            today={today}
        />
    )
}

const CategoryHistoryChart = dynamic(
    () =>
        import("./category-history-chart").then(
            (module) => module.CategoryHistoryChart
        ),
    { loading: () => <SectionLoading label="Loading category spending…" /> }
)
const BudgetHistoryChart = dynamic(
    () =>
        import("./budget-history-chart").then(
            (module) => module.BudgetHistoryChart
        ),
    { loading: () => <SectionLoading label="Loading budget comparison…" /> }
)
export function CachedAnalyticsCategoryHistory({
    accountId,
}: {
    accountId: string
}) {
    const today = useWorkspaceDay()
    if (!today) return <SectionLoading label="Loading category spending…" />
    return (
        <CategoryHistoryChart
            key={accountId}
            accountId={accountId}
            today={today}
        />
    )
}
export function CachedAnalyticsBudgetHistory({
    accountId,
}: {
    accountId: string
}) {
    const today = useWorkspaceDay()
    if (!today) return <SectionLoading label="Loading budget comparison…" />
    return (
        <BudgetHistoryChart
            key={accountId}
            accountId={accountId}
            today={today}
        />
    )
}
