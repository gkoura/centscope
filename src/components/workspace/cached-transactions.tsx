"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { formatPeriod } from "@/lib/i18n/format"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { periodQuery } from "@/lib/account-period"
import Link from "@/components/i18n/link"
import { RecurringSync } from "@/components/financial-accounts/recurring-sync"
import { type TransactionQuery } from "@/lib/transaction-filters"
import { categorySelectOptions } from "@/lib/category-input"
import { PeriodControls } from "@/components/workspace/period-controls"
import { TransactionControls } from "@/components/workspace/transaction-controls"
import { TransactionFeed } from "@/components/workspace/transaction-feed"
import { ActivitySummary } from "@/components/workspace/activity-summary"
import { BalanceSummary } from "@/components/workspace/balance-summary"
import { Button } from "@/components/ui/button"
import {
    Empty,
    EmptyHeader,
    EmptyTitle,
    EmptyDescription,
    EmptyMedia,
    EmptyContent,
} from "@/components/ui/empty"
import { ReceiptText, ChevronLeft, ChevronRight } from "lucide-react"

export function CachedTransactions({
    accountId: id,
    query,
}: {
    accountId: string
    query: TransactionQuery
}) {
    const locale = useLocale()

    const t = useTranslations()

    const reference = useWorkspaceQuery("reference", id)
    const result = useWorkspaceQuery("transactions", id, query)
    if (!reference.data || !result.data)
        return (
            <WorkspaceQueryState
                queries={[reference, result]}
                label={t("Loading this period’s transactions…")}
            />
        )
    const { wallets, categories } = reference.data
    const { history, activity, period, filters } = result.data
    const before = typeof query.before === "string" ? query.before : undefined,
        after = typeof query.after === "string" ? query.after : undefined
    const base = `/dashboard/accounts/${id}/transactions`
    const filterQuery = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
    ) as Record<string, string>
    const currentQuery = { ...filterQuery, ...periodQuery(period) }
    if (period.view !== "custom") {
        delete currentQuery.from
        delete currentQuery.to
    }
    const pageHref = (cursor?: { before?: string; after?: string }) =>
        `${base}?${new URLSearchParams({ ...currentQuery, ...cursor })}`
    const selectedFilters = Boolean(
        filters.q ||
        filters.wallet ||
        filters.category ||
        filters.type ||
        filters.status
    )
    const categoryOptions = [
        ...categorySelectOptions(categories, "EXPENSE"),
        ...categorySelectOptions(categories, "INCOME"),
    ].map((item) => ({ id: item.value, name: item.label }))
    return (
        <div className="flex min-w-0 flex-col gap-5">
            <RecurringSync accountId={id} />
            <BalanceSummary
                compact
                selectedWalletId={filters.wallet}
                wallets={wallets}
                accountId={id}
                periodQuery={periodQuery(period)}
            />
            <PeriodControls
                period={period}
                basePath={base}
                query={currentQuery}
            />
            <ActivitySummary compact activity={activity} />
            <TransactionControls
                accountId={id}
                period={period}
                filters={filters}
                wallets={wallets}
                categories={categoryOptions}
            />
            {history.transactions.length ? (
                <section aria-label={t("Transaction history")}>
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <h2 className="text-sm font-medium">
                            {period.view === "month"
                                ? t("All transactions")
                                : t("Transactions")}
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {period.view === "month"
                                ? t("{value0} in {value1}", {
                                      value0: activity.count,
                                      value1: formatPeriod(period, locale),
                                  })
                                : t("{value0} shown · {value1} total", {
                                      value0: history.transactions.length,
                                      value1: activity.count,
                                  })}
                        </span>
                    </div>
                    <TransactionFeed
                        key={JSON.stringify(currentQuery)}
                        accountId={id}
                        transactions={history.transactions}
                        returnTo={pageHref({
                            ...(before ? { before } : {}),
                            ...(after ? { after } : {}),
                        })}
                    />
                </section>
            ) : (
                <Empty className="border bg-card py-12">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ReceiptText />
                        </EmptyMedia>
                        <EmptyTitle>
                            {selectedFilters
                                ? t("No matching transactions")
                                : t("A fresh page for this period")}
                        </EmptyTitle>
                        <EmptyDescription>
                            {selectedFilters
                                ? t(
                                      "Try another search or clear the filters. Your selected period will stay the same."
                                  )
                                : t(
                                      "No entries for these dates. Browse another period or add a transaction."
                                  )}
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button
                            variant="outline"
                            nativeButton={false}
                            render={
                                <Link
                                    href={
                                        selectedFilters
                                            ? `${base}?${new URLSearchParams(periodQuery(period))}`
                                            : base
                                    }
                                    scroll={false}
                                />
                            }
                        >
                            {selectedFilters
                                ? t("Clear filters")
                                : t("Go to this month")}
                        </Button>
                    </EmptyContent>
                </Empty>
            )}
            {period.view !== "month" &&
                (history.previousCursor ||
                    history.nextCursor ||
                    before ||
                    after) && (
                    <nav
                        aria-label={t("Transaction pages")}
                        className="flex items-center justify-between gap-3 border-t pt-5"
                    >
                        <Button
                            variant="outline"
                            disabled={!history.previousCursor}
                            nativeButton={!history.previousCursor}
                            render={
                                history.previousCursor ? (
                                    <Link
                                        href={pageHref({
                                            after: history.previousCursor,
                                        })}
                                    />
                                ) : undefined
                            }
                        >
                            <ChevronLeft data-icon="inline-start" />
                            {t("Newer")}
                        </Button>
                        <Link
                            href={pageHref()}
                            className="text-xs text-muted-foreground"
                        >
                            {t("First page")}
                        </Link>
                        <Button
                            variant="outline"
                            disabled={!history.nextCursor}
                            nativeButton={!history.nextCursor}
                            render={
                                history.nextCursor ? (
                                    <Link
                                        href={pageHref({
                                            before: history.nextCursor,
                                        })}
                                    />
                                ) : undefined
                            }
                        >
                            {t("Older")}
                            <ChevronRight data-icon="inline-end" />
                        </Button>
                    </nav>
                )}
        </div>
    )
}
