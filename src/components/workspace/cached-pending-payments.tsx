"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { PendingPayments } from "./pending-payments"

export function CachedPendingPayments({ accountId }: { accountId: string }) {
    const t = useTranslations()

    const result = useWorkspaceQuery("pendingPayments", accountId)
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label={t("Loading pending payments…")}
            />
        )
    return <PendingPayments accountId={accountId} summary={result.data} />
}
