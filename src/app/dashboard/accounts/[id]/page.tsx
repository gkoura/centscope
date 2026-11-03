import Link from "next/link"
import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import {
    AccountSummary,
    AccountWallets,
    AccountTransactions,
} from "./_components/account-sections"

export default function AccountPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ before?: string | string[] }>
}) {
    return (
        <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 p-6 sm:p-10">
            <Link
                href="/dashboard"
                className="text-sm underline underline-offset-4"
            >
                Back to accounts
            </Link>
            <Suspense
                fallback={<SectionLoading label="Loading account details…" />}
            >
                <AccountSummary params={params} />
            </Suspense>
            <Suspense
                fallback={
                    <>
                        <h2 className="text-lg font-semibold">Wallets</h2>
                        <SectionLoading label="Loading wallets…" />
                    </>
                }
            >
                <AccountWallets params={params} />
            </Suspense>
            <Suspense
                fallback={
                    <>
                        <h2 className="text-lg font-semibold">Transactions</h2>
                        <SectionLoading label="Loading transactions…" />
                    </>
                }
            >
                <AccountTransactions
                    params={params}
                    searchParams={searchParams}
                />
            </Suspense>
        </main>
    )
}
