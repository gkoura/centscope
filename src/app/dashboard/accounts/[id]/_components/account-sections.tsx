import Link from "next/link"
import { notFound } from "next/navigation"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { cache } from "react"
import { listOwnedAccountWallets } from "@/lib/wallets"
import { WalletCards } from "@/components/financial-accounts/wallet-cards"
import { PlusIcon, WalletIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

type AccountParams = Promise<{ id: string }>
const resolveAccount = cache(async (params: AccountParams) => {
    const { id } = await params
    const account = await getOwnedFinancialAccount(id)
    if (!account) notFound()
    return account
})

const resolveWallets = cache(listOwnedAccountWallets)

export async function AccountSummary({ params }: { params: AccountParams }) {
    const account = await resolveAccount(params)
    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <h1 className="break-words">{account.name}</h1>
                </CardTitle>
                <CardDescription>
                    Reporting currency: {account.reportingCurrency}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-4">
                <Badge variant="secondary">Owner</Badge>
                <Link
                    href={`/dashboard/accounts/${account.id}/categories`}
                    className="text-sm underline underline-offset-4"
                >
                    Manage categories
                </Link>
                <Link
                    href={`/dashboard/accounts/${account.id}/analysis`}
                    className="text-sm underline underline-offset-4"
                >
                    Monthly analysis
                </Link>
                <p className="text-sm text-muted-foreground">
                    Keep track of the money you hold in bank accounts, cash, and
                    other wallets.
                </p>
            </CardContent>
        </Card>
    )
}

export async function AccountWallets({ params }: { params: AccountParams }) {
    const account = await resolveAccount(params)
    const wallets = await resolveWallets(account.id)
    return (
        <section
            aria-labelledby="wallets-heading"
            className="flex flex-col gap-4"
        >
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 id="wallets-heading" className="text-lg font-semibold">
                    Wallets
                </h2>
                {wallets.length ? (
                    <Button
                        render={
                            <Link
                                href={`/dashboard/accounts/${account.id}/wallets/new`}
                            />
                        }
                        nativeButton={false}
                    >
                        <PlusIcon data-icon="inline-start" />
                        Add wallet
                    </Button>
                ) : null}
            </div>
            {wallets.length ? (
                <WalletCards
                    financialAccountId={account.id}
                    wallets={wallets}
                    today={new Date().toISOString().slice(0, 10)}
                />
            ) : (
                <Empty className="border py-10">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <WalletIcon />
                        </EmptyMedia>
                        <EmptyTitle>Add your first wallet</EmptyTitle>
                        <EmptyDescription>
                            Start with a bank account or the cash you keep on
                            hand.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button
                            render={
                                <Link
                                    href={`/dashboard/accounts/${account.id}/wallets/new`}
                                />
                            }
                            nativeButton={false}
                        >
                            <PlusIcon data-icon="inline-start" />
                            Add wallet
                        </Button>
                    </EmptyContent>
                </Empty>
            )}
        </section>
    )
}

export { TransactionWorkspace as AccountTransactions } from "./transaction-workspace"
