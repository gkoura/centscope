import { getTranslations } from "@/lib/i18n/server"
import Link from "@/components/i18n/link"
import { Suspense } from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionLoading } from "@/components/site/section-loading"
import { AccountList } from "../_components/account-list"

export default async function DashboardPage() {
    const t = await getTranslations()

    return (
        <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-8 p-6 sm:p-10">
            <section
                aria-labelledby="accounts-heading"
                className="flex flex-col gap-6"
            >
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <h1
                            id="accounts-heading"
                            className="text-2xl font-semibold tracking-tight"
                        >
                            {t("Your accounts")}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t(
                                "Your first account is your default. Drag to reorder, then save your changes."
                            )}
                        </p>
                    </div>
                    <Button
                        render={<Link href="/dashboard/accounts/new" />}
                        nativeButton={false}
                    >
                        <PlusIcon data-icon="inline-start" />
                        {t("Create account")}
                    </Button>
                </div>
                <Suspense
                    fallback={
                        <SectionLoading label={t("Loading your accounts…")} />
                    }
                >
                    <AccountList />
                </Suspense>
            </section>
        </main>
    )
}
