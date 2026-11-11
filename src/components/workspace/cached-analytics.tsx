"use client"

import { useWorkspaceDay, useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { PeriodControls } from "./period-controls"
import { ActivitySummary } from "./activity-summary"
import { CategorySpending } from "./category-spending"
import { analyticsPeriodInput } from "@/lib/analytics"
import { resolveAccountPeriod } from "@/lib/account-period"
import type { TransactionQuery } from "@/lib/transaction-filters"
import { SectionLoading } from "@/components/site/section-loading"
import dynamic from "next/dynamic"

const MonthlyTrends = dynamic(
    () => import("./monthly-trends").then((module) => module.MonthlyTrends),
    { loading: () => <SectionLoading label="Loading monthly trends…" /> }
)

export function CachedAnalyticsMonthlyTrends({
    accountId,
}: {
    accountId: string
}) {
    const today = useWorkspaceDay()
    if (!today) return <SectionLoading label="Loading monthly trends…" />
    return <MonthlyTrends key={accountId} accountId={accountId} today={today} />
}

type Props = { accountId: string; query: TransactionQuery }

export function CachedAnalyticsControls({ accountId, query }: Props) {
    const today = useWorkspaceDay()
    if (!today) return <SectionLoading label="Loading period controls…" />
    const period = resolveAccountPeriod(analyticsPeriodInput(query), today)
    return (
        <div className="contents">
            <PeriodControls
                period={period}
                basePath={`/dashboard/accounts/${accountId}/analytics`}
            />
            <p className="text-xs leading-6 text-muted-foreground">
                All wallets · posted activity for {period.label}. Currencies are
                shown separately.
            </p>
        </div>
    )
}
export function CachedAnalyticsActivity({ accountId, query }: Props) {
    const result = useWorkspaceQuery(
        "activity",
        accountId,
        analyticsPeriodInput(query)
    )
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label="Loading posted totals and wallet activity…"
            />
        )
    return <ActivitySummary activity={result.data} walletActivityExpanded />
}
export function CachedAnalyticsCategories({ accountId, query }: Props) {
    const result = useWorkspaceQuery(
        "activity",
        accountId,
        analyticsPeriodInput(query)
    )
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label="Loading category spending…"
            />
        )
    return (
        <CategorySpending
            key={accountId}
            categories={result.data.categories}
            incomeCategories={result.data.incomeCategories}
        />
    )
}
