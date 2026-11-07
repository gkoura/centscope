import { getTranslations } from "@/lib/i18n/server"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionLoading } from "@/components/site/section-loading"
import { AccountWallets } from "./_components/account-sections"
import {
    OverviewTools,
    OverviewRecurring,
    OverviewBalances,
    OverviewBalanceHistory,
    OverviewPendingPayments,
} from "./_components/overview-content"
import type { TransactionQuery } from "@/lib/transaction-filters"
export default async function AccountPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}) {
    const t = await getTranslations()

    return (
        <main className="workspace-page overview-page">
            <header>
                <p className="eyebrow mb-2">{t("YOUR MONEY, AT A GLANCE")}</p>
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {t("Overview")}
                    </h1>
                    <Suspense
                        fallback={<Skeleton className="h-11 w-36 rounded-xl" />}
                    >
                        <OverviewTools params={params} />
                    </Suspense>
                </div>
            </header>
            <Suspense
                fallback={<SectionLoading label={t("Loading balances…")} />}
            >
                <OverviewBalances params={params} searchParams={searchParams} />
            </Suspense>
            <Suspense
                fallback={
                    <SectionLoading label={t("Loading pending payments…")} />
                }
            >
                <OverviewPendingPayments params={params} />
            </Suspense>
            <Suspense
                fallback={
                    <div className="min-h-80">
                        <SectionLoading label={t("Loading balance history…")} />
                    </div>
                }
            >
                <OverviewBalanceHistory params={params} />
            </Suspense>
            <details id="wallet-settings" className="wallet-management">
                <summary className="cursor-pointer rounded-2xl border bg-card px-5 py-4 text-sm font-medium">
                    {t("Manage wallets")}{" "}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {t("Add, edit & reorder")}
                    </span>
                </summary>
                <div className="pt-5">
                    <Suspense
                        fallback={
                            <SectionLoading
                                label={t("Loading wallet settings…")}
                            />
                        }
                    >
                        <AccountWallets params={params} />
                    </Suspense>
                </div>
            </details>
            <Suspense
                fallback={
                    <SectionLoading
                        label={t("Loading recurring transactions…")}
                    />
                }
            >
                <OverviewRecurring params={params} />
            </Suspense>
        </main>
    )
}
