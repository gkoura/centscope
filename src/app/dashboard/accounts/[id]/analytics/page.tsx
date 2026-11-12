import { Suspense } from "react"
import type { Metadata } from "next"
import { SectionLoading } from "@/components/site/section-loading"
import {
    AnalyticsBalanceHistory,
    AnalyticsMonthlyTrends,
    AnalyticsCategoryHistory,
    AnalyticsBudgetHistory,
} from "./_components/analytics-content"

export const metadata: Metadata = { title: "Analytics" }
export default function AnalyticsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    return (
        <main className="workspace-page">
            <header>
                <p className="eyebrow mb-2">UNDERSTAND YOUR MONEY</p>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Analytics
                </h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Your balance, income, and spending over the last 12 months.
                </p>
            </header>
            <Suspense
                fallback={<SectionLoading label="Loading balance history…" />}
            >
                <AnalyticsBalanceHistory params={params} />
            </Suspense>
            <Suspense
                fallback={<SectionLoading label="Loading monthly trends…" />}
            >
                <AnalyticsMonthlyTrends params={params} />
            </Suspense>
            <Suspense
                fallback={<SectionLoading label="Loading category spending…" />}
            >
                <AnalyticsCategoryHistory params={params} />
            </Suspense>
            <Suspense
                fallback={<SectionLoading label="Loading budget comparison…" />}
            >
                <AnalyticsBudgetHistory params={params} />
            </Suspense>
        </main>
    )
}
