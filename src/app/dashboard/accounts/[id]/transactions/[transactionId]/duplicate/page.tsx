import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { DuplicateTransactionContent } from "./_components/duplicate-transaction-content"

export default function Page({
    params,
    searchParams,
}: {
    params: Promise<{ id: string; transactionId: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    return (
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 sm:p-10">
            <h1 className="text-2xl font-semibold tracking-tight">
                Duplicate transaction
            </h1>
            <p className="text-sm text-muted-foreground">
                Review and save a copy on your chosen date. The original
                transaction and its repeat schedule stay unchanged.
            </p>
            <Suspense
                fallback={
                    <SectionLoading label="Loading transaction to copy…" />
                }
            >
                <DuplicateTransactionContent
                    params={params}
                    searchParams={searchParams}
                />
            </Suspense>
        </main>
    )
}
