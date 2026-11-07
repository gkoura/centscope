"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { RecurringSummary } from "./recurring-summary"
export function CachedRecurringSummary({ accountId }: { accountId: string }) {
    const t = useTranslations()

    const result = useWorkspaceQuery("recurring", accountId)
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label={t("Loading recurring transactions…")}
            />
        )
    return <RecurringSummary accountId={accountId} rules={result.data} />
}
