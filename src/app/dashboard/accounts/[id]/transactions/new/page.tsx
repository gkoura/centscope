import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { TransactionContent } from "./_components/transaction-content"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    return (
        <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6 sm:p-10">
            <h1 className="text-2xl font-semibold tracking-tight">
                Add an expense or income
            </h1>
            <Suspense
                fallback={<SectionLoading label="Loading account details…" />}
            >
                <TransactionContent params={params} />
            </Suspense>
        </main>
    )
}
