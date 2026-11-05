import { validDay } from "@/lib/account-period"
import { transactionReturnPath } from "@/lib/transaction-return"
import { listOwnedTransactionSuggestions } from "@/lib/transactions"
import { randomUUID } from "node:crypto"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { listOwnedAccountWallets } from "@/lib/wallets"
import { listOwnedAccountCategories } from "@/lib/categories"
import { CreateTransactionForm } from "@/components/financial-accounts/create-transaction-form"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from "@/components/ui/card"

export async function TransactionContent({
    params,
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
    params: Promise<{ id: string }>
}) {
    const query = await searchParams
    const { id } = await params
    const returnTo = transactionReturnPath(query.returnTo, id)
    const account = await getOwnedFinancialAccount(id)
    if (!account) notFound()
    const [wallets, categories, suggestions] = await Promise.all([
        listOwnedAccountWallets(account.id),
        listOwnedAccountCategories(account.id),
        listOwnedTransactionSuggestions(account.id),
    ])
    return (
        <>
            <Link
                href={returnTo}
                className="text-sm underline underline-offset-4"
            >
                Back to transactions
            </Link>
            <Card>
                <CardHeader>
                    <CardDescription>
                        Record money spent or received in {account.name}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {wallets.length ? (
                        <CreateTransactionForm
                            returnTo={returnTo}
                            initialWalletId={
                                wallets.some((w) => w.id === query.wallet)
                                    ? String(query.wallet)
                                    : undefined
                            }
                            financialAccountId={account.id}
                            requestId={randomUUID()}
                            today={
                                typeof query.date === "string" &&
                                validDay(query.date)
                                    ? query.date
                                    : new Date().toISOString().slice(0, 10)
                            }
                            wallets={wallets.map(({ id, name, currency }) => ({
                                id,
                                name,
                                currency,
                            }))}
                            categories={categories}
                            suggestions={suggestions}
                        />
                    ) : (
                        <p className="text-sm">
                            Add a wallet before recording a transaction.{" "}
                            <Link
                                href={`/dashboard/accounts/${account.id}/wallets/new`}
                                className="underline underline-offset-4"
                            >
                                Add wallet
                            </Link>
                        </p>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
