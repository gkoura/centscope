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
    CardTitle,
} from "@/components/ui/card"

export default async function NewTransactionPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const account = await getOwnedFinancialAccount(id)
    if (!account) notFound()
    const [wallets, categories] = await Promise.all([
        listOwnedAccountWallets(account.id),
        listOwnedAccountCategories(account.id),
    ])
    return (
        <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6 sm:p-10">
            <Link
                href={`/dashboard/accounts/${account.id}`}
                className="text-sm underline underline-offset-4"
            >
                Back to account
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle>
                        <h1>Add an expense or income</h1>
                    </CardTitle>
                    <CardDescription>
                        Record money spent or received in {account.name}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {wallets.length ? (
                        <CreateTransactionForm
                            financialAccountId={account.id}
                            requestId={randomUUID()}
                            today={new Date().toISOString().slice(0, 10)}
                            wallets={wallets.map(({ id, name, currency }) => ({
                                id,
                                name,
                                currency,
                            }))}
                            categories={categories}
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
        </main>
    )
}
