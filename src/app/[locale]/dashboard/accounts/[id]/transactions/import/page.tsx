import { getTranslations } from "@/lib/i18n/server"
import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { ImportContent } from "./_components/import-content"

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const t = await getTranslations()

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 sm:p-10">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                    {t("Import transactions")}
                </h1>
                <p className="text-muted-foreground">
                    {t(
                        "Use our CSV template to bring your transaction history into CentScope."
                    )}
                </p>
            </header>
            <Suspense
                fallback={<SectionLoading label={t("Loading import…")} />}
            >
                <ImportContent params={params} />
            </Suspense>
        </main>
    )
}
