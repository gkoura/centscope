import { Suspense } from "react"
import type { Metadata } from "next"
import type { TransactionQuery } from "@/lib/transaction-filters"
import { SectionLoading } from "@/components/site/section-loading"
import {
    AnalyticsControls,
    AnalyticsActivity,
    AnalyticsCategories,
    AnalyticsMonthlyTrends,
} from "./_components/analytics-content"

export const metadata: Metadata = { title: "Analytics" }
export default function AnalyticsPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}) {
    return (
        <main className="workspace-page">
            <header>
                <p className="eyebrow mb-2">UNDERSTAND YOUR MONEY</p>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Analytics
                </h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Your income, spending, and category patterns for any period.
                </p>
            </header>
            <Suspense
                fallback={<SectionLoading label="Loading period controls…" />}
            >
                <AnalyticsControls
                    params={params}
                    searchParams={searchParams}
                />
            </Suspense>
            <Suspense
                fallback={
                    <SectionLoading label="Loading posted totals and wallet activity…" />
                }
            >
                <AnalyticsActivity
                    params={params}
                    searchParams={searchParams}
                />
            </Suspense>
            <Suspense
                fallback={<SectionLoading label="Loading category spending…" />}
            >
                <AnalyticsCategories
                    params={params}
                    searchParams={searchParams}
                />
            </Suspense>
            <Suspense
                fallback={<SectionLoading label="Loading monthly trends…" />}
            >
                <AnalyticsMonthlyTrends params={params} />
            </Suspense>
        </main>
    )
}
