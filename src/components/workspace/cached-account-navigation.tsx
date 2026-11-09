"use client"
import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { AccountNavigation } from "@/components/financial-accounts/account-navigation"
import { Suspense } from "react"
import { WorkspacePrefetch } from "./workspace-prefetch"
export function CachedAccountNavigation({
    accountId,
    shared,
    theme,
    isOwner,
}: {
    accountId: string
    theme: string
    isOwner: boolean
    shared: { id: string; name: string; theme?: string }[]
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
                theme={theme}
                isOwner={isOwner}
                accounts={result.data}
                shared={shared}
            />
            <Suspense fallback={null}>
                <WorkspacePrefetch accountId={accountId} />
            </Suspense>
        </>
    )
}
