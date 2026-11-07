import { getTranslations } from "@/lib/i18n/server"
import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { DefaultAccount } from "./_components/default-account"
export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const t = await getTranslations()

    return (
        <main className="workspace-page">
            <h1 className="sr-only">{t("Your workspace")}</h1>
            <Suspense
                fallback={
                    <SectionLoading
                        label={t("Opening your default account…")}
                    />
                }
            >
                <DefaultAccount searchParams={searchParams} />
            </Suspense>
        </main>
    )
}
