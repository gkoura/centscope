import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { TransactionWorkspace } from "../_components/transaction-workspace"
import type { TransactionQuery } from "@/lib/transaction-filters"

export default function Page({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}) {
    return (
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 sm:p-10">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Transactions
                </h1>
                <p className="text-muted-foreground">
                    Your money in and out. Find an entry, record something new,
                    or bring in your history.
                </p>
            </header>
            <Suspense
                fallback={<SectionLoading label="Loading transactions…" />}
            >
                <TransactionWorkspace
                    params={params}
                    searchParams={searchParams}
                    full
                />
            </Suspense>
        </main>
    )
}
