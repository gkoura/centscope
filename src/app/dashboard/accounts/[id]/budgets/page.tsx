import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { BudgetsContent } from "./_components/budgets-content"

export default function Page({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-10">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Budgets
                </h1>
                <p className="text-sm text-muted-foreground">
                    Give your spending a little direction. Create a recurring
                    plan and see how you do each period.
                </p>
            </div>
            <Suspense fallback={<SectionLoading label="Loading budgets…" />}>
                <BudgetsContent params={params} searchParams={searchParams} />
            </Suspense>
        </main>
    )
}
