import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { ImportContent } from "./_components/import-content"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    return (
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 sm:p-10">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Import transactions
                </h1>
                <p className="text-muted-foreground">
                    Use our CSV template to bring your transaction history into
                    Fintrack.
                </p>
            </header>
            <Suspense fallback={<SectionLoading label="Loading import…" />}>
                <ImportContent params={params} />
            </Suspense>
        </main>
    )
}
