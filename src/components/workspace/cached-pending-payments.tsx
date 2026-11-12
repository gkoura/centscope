"use client"
import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { PendingPayments } from "./pending-payments"

export function CachedPendingPayments({ accountId }: { accountId: string }) {
    const result = useWorkspaceQuery("pendingPayments", accountId)
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label="Loading overdue payments…"
            />
        )
    return <PendingPayments accountId={accountId} summary={result.data} />
}
