"use client"
import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useWorkspaceScope } from "@/components/workspace/workspace-cache-provider"
import { useWorkspaceDay } from "@/components/workspace/use-workspace-query"
import { startWorkspacePrefetch } from "@/lib/workspace-prefetch"
import {
    workspaceRevision,
    publishWorkspaceEvent,
} from "@/lib/workspace-cache-events"
import {
    WorkspaceReadError,
    workspaceQueryOptions,
} from "@/lib/workspace-query-options"
import type { WorkspaceRequest } from "@/lib/workspace-cache-policy"
import type { BudgetCadence } from "@/lib/budget-period"
import type { BudgetMode } from "@/lib/budget-contribution"

export function budgetDetailRequest(
    accountId: string,
    budgetId: string,
    cadence: BudgetCadence,
    date: string,
    mode: BudgetMode,
    page = 0
): WorkspaceRequest & { resource: "budgetTransactions" } {
    return {
        resource: "budgetTransactions",
        accountId,
        query: { budgetId, cadence, date, mode, page: String(page) },
    }
}
function scheduleIdle(run: () => void) {
    let idle: number | undefined
    const timer = setTimeout(() => {
        if ("requestIdleCallback" in window)
            idle = window.requestIdleCallback(run, { timeout: 1000 })
        else run()
    }, 200)
    return () => {
        clearTimeout(timer)
        if (idle !== undefined) window.cancelIdleCallback(idle)
    }
}
function allowed() {
    const connection = (
        navigator as Navigator & {
            connection?: { saveData?: boolean; effectiveType?: string }
        }
    ).connection
    return (
        document.visibilityState !== "hidden" &&
        navigator.onLine &&
        !connection?.saveData &&
        !["2g", "slow-2g"].includes(connection?.effectiveType ?? "")
    )
}
export function useBudgetPrefetch(
    accountId: string,
    ids: string[],
    cadence: BudgetCadence,
    date: string,
    mode: BudgetMode
) {
    const client = useQueryClient(),
        { userId, revision, ready } = useWorkspaceScope(),
        today = useWorkspaceDay()
    const key = ids.slice(0, 4).join(",")
    useEffect(() => {
        if (!ready || !today || !key) return
        const scope = { userId, revision }
        const prefetch = startWorkspacePrefetch(
            client,
            scope,
            key
                .split(",")
                .map((id) =>
                    budgetDetailRequest(accountId, id, cadence, date, mode)
                ),
            today,
            {
                scheduleIdle,
                canRun: () =>
                    allowed() && workspaceRevision() === scope.revision,
                onError: (error) => {
                    if (
                        error instanceof WorkspaceReadError &&
                        error.status === 409
                    )
                        publishWorkspaceEvent({ type: "changed" })
                },
            }
        )
        const resume = () => prefetch.resume()
        window.addEventListener("online", resume)
        window.addEventListener("focus", resume)
        document.addEventListener("visibilitychange", resume)
        return () => {
            prefetch.stop()
            window.removeEventListener("online", resume)
            window.removeEventListener("focus", resume)
            document.removeEventListener("visibilitychange", resume)
        }
    }, [
        client,
        userId,
        revision,
        ready,
        accountId,
        cadence,
        date,
        mode,
        today,
        key,
    ])
    return (budgetId: string) => {
        if (!ready || !today || !allowed() || workspaceRevision() !== revision)
            return
        void client.prefetchQuery(
            workspaceQueryOptions(
                { userId, revision },
                budgetDetailRequest(accountId, budgetId, cadence, date, mode),
                today,
                "low"
            )
        )
    }
}
