import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { CategoriesContent } from "./_components/categories-content"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-10">
            <h1 className="text-2xl font-semibold tracking-tight">
                Categories
            </h1>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                A little structure for everyday life. Organize your expenses and
                income in a way that feels natural to you.
            </p>
            <Suspense
                fallback={<SectionLoading label="Loading account details…" />}
            >
                <CategoriesContent params={params} />
            </Suspense>
        </main>
    )
}
