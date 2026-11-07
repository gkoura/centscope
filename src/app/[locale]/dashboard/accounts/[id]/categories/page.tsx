import { getTranslations } from "@/lib/i18n/server"
import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { CategoriesContent } from "./_components/categories-content"

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const t = await getTranslations()

    return (
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-10">
            <h1 className="text-2xl font-semibold tracking-tight">
                {t("Categories")}
            </h1>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                {t(
                    "A little structure for everyday life. Organize your expenses and income in a way that feels natural to you."
                )}
            </p>
            <Suspense
                fallback={
                    <SectionLoading label={t("Loading account details…")} />
                }
            >
                <CategoriesContent params={params} />
            </Suspense>
        </main>
    )
}
