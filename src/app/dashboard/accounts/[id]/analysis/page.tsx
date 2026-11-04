import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { MonthlyAnalysisContent } from "./_components/monthly-analysis-content"

export default function MonthlyAnalysisPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    return (
        <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-6 p-6 sm:p-10">
            <h1 className="text-2xl font-semibold">Monthly analysis</h1>
            <p className="text-sm text-muted-foreground">
                Understand monthly costs with smoothed spending or actual
                payments. Spreading costs never changes your wallet balances.
            </p>
            <Suspense
                fallback={<SectionLoading label="Loading monthly spending…" />}
            >
                <MonthlyAnalysisContent
                    params={params}
                    searchParams={searchParams}
                />
            </Suspense>
        </main>
    )
}
