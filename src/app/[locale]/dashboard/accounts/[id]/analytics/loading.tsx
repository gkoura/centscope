import { getTranslations } from "@/lib/i18n/server"
import { SectionLoading } from "@/components/site/section-loading"
export default async function AnalyticsLoading() {
    const t = await getTranslations()

    return (
        <main className="workspace-page">
            <h1 className="text-2xl font-semibold tracking-tight">
                {t("Analytics")}
            </h1>
            <SectionLoading label={t("Loading analytics…")} />
        </main>
    )
}
