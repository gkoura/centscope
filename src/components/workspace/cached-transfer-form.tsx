"use client"
import { useWorkspaceQuery, useWorkspaceDay } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { validDay } from "@/lib/account-period"
import { transactionReturnPath } from "@/lib/transaction-return"
import Link from "next/link"
import { TransferForm } from "@/components/financial-accounts/transfer-form"
export function CachedTransferForm({
    accountId: id,
    query,
    requestId,
}: {
    accountId: string
    query: { source?: string; returnTo?: string; date?: string }
    requestId: string
}) {
    const result = useWorkspaceQuery("transferWallets", id)
    const today = useWorkspaceDay()
    if (!result.data || !today)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label="Loading transfer form…"
            />
        )
    const wallets = result.data
    const returnTo = transactionReturnPath(query.returnTo, id)
    return (
        <>
            <Link
                href={returnTo}
                className="text-sm underline underline-offset-4"
            >
                Back to transactions
            </Link>
            {wallets.length < 2 ? (
                <p>Add another wallet before creating a transfer.</p>
            ) : (
                <TransferForm
                    returnTo={returnTo}
                    contextAccountId={id}
                    wallets={wallets}
                    requestId={requestId}
                    today={
                        typeof query.date === "string" && validDay(query.date)
                            ? query.date
                            : today
                    }
                    sourceId={
                        typeof query.source === "string"
                            ? query.source
                            : undefined
                    }
                />
            )}
        </>
    )
}
