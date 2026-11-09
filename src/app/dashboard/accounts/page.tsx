import Link from "next/link"
import { Suspense } from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionLoading } from "@/components/site/section-loading"
import { SharedAccounts } from "../_components/shared-accounts"
import { AccountList } from "../_components/account-list"

export default function DashboardPage() {
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
                            Your accounts
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Open an overview, manage wallets, or share an
                            account. Your first account is your default.
                        </p>
                    </div>
                    <Button
                        render={<Link href="/dashboard/accounts/new" />}
                        nativeButton={false}
                    >
                        <PlusIcon data-icon="inline-start" />
                        Create account
                    </Button>
                </div>
                <Suspense
                    fallback={<SectionLoading label="Loading your accounts…" />}
                >
                    <AccountList />
                </Suspense>
            </section>
            <Suspense
                fallback={<SectionLoading label="Loading shared accounts…" />}
            >
                <SharedAccounts />
            </Suspense>
        </main>
    )
}
