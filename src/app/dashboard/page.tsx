import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { DefaultAccount } from "./_components/default-account"
export default function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    return (
        <main className="workspace-page">
            <h1 className="sr-only">Your workspace</h1>
            <Suspense
                fallback={
                    <SectionLoading label="Opening your default account…" />
                }
            >
                <DefaultAccount searchParams={searchParams} />
            </Suspense>
        </main>
    )
}
