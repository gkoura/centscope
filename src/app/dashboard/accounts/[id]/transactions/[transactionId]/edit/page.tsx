import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { EditTransactionContent } from "./_components/edit-transaction-content"
export default function Page({
    params,
}: {
    params: Promise<{ id: string; transactionId: string }>
}) {
    return (
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 sm:p-10">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Edit transaction
                </h1>
                <p className="text-muted-foreground">
                    Corrections update your balances and preserve the previous
                    details in the audit history.
                </p>
            </header>
            <Suspense
                fallback={<SectionLoading label="Loading transaction…" />}
            >
                <EditTransactionContent params={params} />
            </Suspense>
        </main>
    )
}
