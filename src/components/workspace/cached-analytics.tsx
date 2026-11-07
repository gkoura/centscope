"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { formatPeriod } from "@/lib/i18n/format"

import { useTranslations } from "@/components/i18n/locale-provider"

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
    const t = useTranslations()

    const today = useWorkspaceDay()
    if (!today) return <SectionLoading label={t("Loading monthly trends…")} />
    return <MonthlyTrends key={accountId} accountId={accountId} today={today} />
}

type Props = { accountId: string; query: TransactionQuery }

export function CachedAnalyticsControls({ accountId, query }: Props) {
    const locale = useLocale()

    const t = useTranslations()

    const today = useWorkspaceDay()
    if (!today) return <SectionLoading label={t("Loading period controls…")} />
    const period = resolveAccountPeriod(analyticsPeriodInput(query), today)
    return (
        <div className="flex flex-col gap-3">
            <PeriodControls
                period={period}
                basePath={`/dashboard/accounts/${accountId}/analytics`}
            />
            <p className="text-xs leading-6 text-muted-foreground">
                {t("All wallets · posted activity for")}{" "}
                {formatPeriod(period, locale)}
                {t(". Currencies are shown separately.")}
            </p>
        </div>
    )
}
export function CachedAnalyticsActivity({ accountId, query }: Props) {
    const t = useTranslations()

    const result = useWorkspaceQuery(
        "activity",
        accountId,
        analyticsPeriodInput(query)
    )
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label={t("Loading posted totals and wallet activity…")}
            />
        )
    return <ActivitySummary activity={result.data} walletActivityExpanded />
}
export function CachedAnalyticsCategories({ accountId, query }: Props) {
    const t = useTranslations()

    const result = useWorkspaceQuery(
        "activity",
        accountId,
        analyticsPeriodInput(query)
    )
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label={t("Loading category spending…")}
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
