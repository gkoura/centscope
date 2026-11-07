import { getTranslations } from "@/lib/i18n/server"
import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { TransactionWorkspace } from "../_components/transaction-workspace"
import type { TransactionQuery } from "@/lib/transaction-filters"
export default async function TransactionsPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}) {
    const t = await getTranslations()

    return (
        <main className="workspace-page transactions-page">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">
                    {t("Transactions")}
                </h1>
            </header>
            <Suspense
                fallback={
                    <SectionLoading
                        label={t("Loading this period’s transactions…")}
                    />
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
