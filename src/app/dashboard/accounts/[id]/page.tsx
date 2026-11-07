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
export default function AccountPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}) {
    return (
        <main className="workspace-page overview-page">
            <header>
                <p className="eyebrow mb-2">YOUR MONEY, AT A GLANCE</p>
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Overview
                    </h1>
                    <Suspense
                        fallback={<Skeleton className="h-11 w-36 rounded-xl" />}
                    >
                        <OverviewTools params={params} />
                    </Suspense>
                </div>
            </header>
            <Suspense fallback={<SectionLoading label="Loading balances…" />}>
                <OverviewBalances params={params} searchParams={searchParams} />
            </Suspense>
            <Suspense
                fallback={<SectionLoading label="Loading pending payments…" />}
            >
                <OverviewPendingPayments params={params} />
            </Suspense>
            <Suspense
                fallback={
                    <div className="min-h-80">
                        <SectionLoading label="Loading balance history…" />
                    </div>
                }
            >
                <OverviewBalanceHistory params={params} />
            </Suspense>
            <details id="wallet-settings" className="wallet-management">
                <summary className="cursor-pointer rounded-2xl border bg-card px-5 py-4 text-sm font-medium">
                    Manage wallets{" "}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Add, edit & reorder
                    </span>
                </summary>
                <div className="pt-5">
                    <Suspense
                        fallback={
                            <SectionLoading label="Loading wallet settings…" />
                        }
                    >
                        <AccountWallets params={params} />
                    </Suspense>
                </div>
            </details>
            <Suspense
                fallback={
                    <SectionLoading label="Loading recurring transactions…" />
                }
            >
                <OverviewRecurring params={params} />
            </Suspense>
        </main>
    )
}
