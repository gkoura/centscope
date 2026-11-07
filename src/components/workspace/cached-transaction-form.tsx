"use client"
import { useWorkspaceQuery, useWorkspaceDay } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { validDay } from "@/lib/account-period"
import { transactionReturnPath } from "@/lib/transaction-return"
import Link from "next/link"
import { CreateTransactionForm } from "@/components/financial-accounts/create-transaction-form"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from "@/components/ui/card"

export function CachedTransactionForm({
    accountId: id,
    query,
    requestId,
}: {
    accountId: string
    query: Record<string, string | string[] | undefined>
    requestId: string
}) {
    const reference = useWorkspaceQuery("reference", id)
    const suggestions = useWorkspaceQuery("suggestions", id)
    const today = useWorkspaceDay()
    if (!reference.data || !today)
        return (
            <WorkspaceQueryState
                queries={[reference]}
                label="Loading transaction form…"
            />
        )
    const { account, wallets, categories } = reference.data
    const returnTo = transactionReturnPath(query.returnTo, id)
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
                            key={account.id}
                            returnTo={returnTo}
                            initialWalletId={
                                wallets.some((w) => w.id === query.wallet)
                                    ? String(query.wallet)
                                    : undefined
                            }
                            financialAccountId={account.id}
                            requestId={requestId}
                            today={
                                typeof query.date === "string" &&
                                validDay(query.date)
                                    ? query.date
                                    : today
                            }
                            wallets={wallets.map(({ id, name, currency }) => ({
                                id,
                                name,
                                currency,
                            }))}
                            categories={categories}
                            suggestions={suggestions.data ?? []}
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
