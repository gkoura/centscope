import { getTranslations } from "@/lib/i18n/server"
import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { TransactionContent } from "./_components/transaction-content"

export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const t = await getTranslations()

    return (
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 sm:p-10">
            <h1 className="text-2xl font-semibold tracking-tight">
                {t("Add an expense or income")}
            </h1>
            <Suspense
                fallback={
                    <SectionLoading label={t("Loading account details…")} />
                }
            >
                <TransactionContent
                    params={params}
                    searchParams={searchParams}
                />
            </Suspense>
        </main>
    )
}
