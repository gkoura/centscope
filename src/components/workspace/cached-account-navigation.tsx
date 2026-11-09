"use client"
import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { AccountNavigation } from "@/components/financial-accounts/account-navigation"
import { Suspense } from "react"
import { WorkspacePrefetch } from "./workspace-prefetch"
export function CachedAccountNavigation({
    accountId,
    shared,
}: {
    accountId: string
    shared: { id: string; name: string }[]
}) {
    const result = useWorkspaceQuery("accounts")
    if (!result.data)
        return (
            <WorkspaceQueryState queries={[result]} label="Loading accounts…" />
        )
    return (
        <>
            <AccountNavigation
                accountId={accountId}
                accounts={result.data}
                shared={shared}
            />
            <Suspense fallback={null}>
                <WorkspacePrefetch accountId={accountId} />
            </Suspense>
        </>
    )
}
