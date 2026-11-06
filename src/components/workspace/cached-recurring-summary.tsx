"use client"
import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { RecurringSummary } from "./recurring-summary"
export function CachedRecurringSummary({ accountId }: { accountId: string }) {
    const result = useWorkspaceQuery("recurring", accountId)
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label="Loading recurring transactions…"
            />
        )
    return <RecurringSummary accountId={accountId} rules={result.data} />
}
