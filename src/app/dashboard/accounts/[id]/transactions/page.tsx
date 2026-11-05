import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { TransactionWorkspace } from "../_components/transaction-workspace"
import type { TransactionQuery } from "@/lib/transaction-filters"
export default function TransactionsPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}) {
    return (
        <main className="workspace-page transactions-page">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Transactions
                </h1>
            </header>
            <Suspense
                fallback={
                    <SectionLoading label="Loading this period’s transactions…" />
                }
            >
                <TransactionWorkspace
                    params={params}
                    searchParams={searchParams}
                />
            </Suspense>
        </main>
    )
}
