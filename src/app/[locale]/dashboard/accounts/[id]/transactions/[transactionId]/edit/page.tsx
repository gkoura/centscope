import { getTranslations } from "@/lib/i18n/server"
import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { EditTransactionContent } from "./_components/edit-transaction-content"
export default async function Page({
    params,
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
    params: Promise<{ id: string; transactionId: string }>
}) {
    const t = await getTranslations()

    return (
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 sm:p-10">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                    {t("Edit transaction")}
                </h1>
                <p className="text-muted-foreground">
                    {t(
                        "Corrections update your balances and preserve the previous details in the audit history."
                    )}
                </p>
            </header>
            <Suspense
                fallback={<SectionLoading label={t("Loading transaction…")} />}
            >
                <EditTransactionContent
                    params={params}
                    searchParams={searchParams}
                />
            </Suspense>
        </main>
    )
}
