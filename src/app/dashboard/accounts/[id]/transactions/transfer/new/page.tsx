import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { TransferContent } from "./_components/transfer-content"
export default function TransferPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ source?: string }>
}) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-10">
            <h1 className="text-2xl font-semibold">Transfer between wallets</h1>
            <p className="text-sm text-muted-foreground">
                Move money between your wallets or financial accounts. Both
                sides are saved together.
            </p>
            <Suspense
                fallback={<SectionLoading label="Loading transfer wallets…" />}
            >
                <TransferContent params={params} searchParams={searchParams} />
            </Suspense>
        </main>
    )
}
