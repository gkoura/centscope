import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { WalletsContent } from "./_components/wallets-content"

export default function WalletsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    return (
        <main className="workspace-page">
            <h1 className="text-2xl font-semibold tracking-tight">
                Account wallets
            </h1>
            <Suspense fallback={<SectionLoading label="Loading wallets…" />}>
                <WalletsContent params={params} />
            </Suspense>
        </main>
    )
}
