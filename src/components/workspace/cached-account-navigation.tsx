"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { AccountNavigation } from "@/components/financial-accounts/account-navigation"
import { Suspense } from "react"
import { WorkspacePrefetch } from "./workspace-prefetch"
export function CachedAccountNavigation({ accountId }: { accountId: string }) {
    const t = useTranslations()

    const result = useWorkspaceQuery("accounts")
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label={t("Loading accounts…")}
            />
        )
    return (
        <>
            <AccountNavigation accountId={accountId} accounts={result.data} />
            <Suspense fallback={null}>
                <WorkspacePrefetch accountId={accountId} />
            </Suspense>
        </>
    )
}
