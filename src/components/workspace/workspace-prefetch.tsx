"use client"
import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
    workspaceQueryOptions,
    WorkspaceReadError,
} from "@/lib/workspace-query-options"
import {
    startWorkspacePrefetch,
    workspacePrefetchPlan,
} from "@/lib/workspace-prefetch"
import {
    clearWorkspaceCache,
    publishWorkspaceEvent,
    workspaceRevision,
    WORKSPACE_CACHE_EVENT,
    type WorkspaceCacheEvent,
} from "@/lib/workspace-cache-events"
import { useWorkspaceScope } from "./workspace-cache-provider"
import { useWorkspaceDay } from "./use-workspace-query"

function scheduleIdle(run: () => void) {
    let idle: number | undefined
    // Let the current commit paint and its demand queries start before considering speculation.
    const timer = window.setTimeout(() => {
        if ("requestIdleCallback" in window)
            idle = window.requestIdleCallback(run, { timeout: 1000 })
        else run()
    }, 200)
    return () => {
        clearTimeout(timer)
        if (idle !== undefined) window.cancelIdleCallback(idle)
    }
}

export function WorkspacePrefetch({ accountId }: { accountId: string }) {
    const client = useQueryClient(),
        router = useRouter()
    const { userId, revision, ready } = useWorkspaceScope()
    const today = useWorkspaceDay(),
        pathname = usePathname(),
        search = useSearchParams().toString()
    useEffect(() => {
        if (!ready || !today) return
        const plan = workspacePrefetchPlan(accountId, pathname, search, today)
        if (!plan) return
        const scope = { userId, revision }
        const referenceKey = workspaceQueryOptions(
            scope,
            { resource: "reference", accountId },
            today
        ).queryKey
        const visibleKey = workspaceQueryOptions(
            scope,
            plan.foreground,
            today
        ).queryKey
        const prefetch = startWorkspacePrefetch(
            client,
            scope,
            plan.requests,
            today,
            {
                scheduleIdle,
                canRun: () => {
                    const connection = (
                        navigator as Navigator & {
                            connection?: {
                                saveData?: boolean
                                effectiveType?: string
                            }
                        }
                    ).connection
                    return (
                        document.visibilityState !== "hidden" &&
                        navigator.onLine &&
                        !connection?.saveData &&
                        !["slow-2g", "2g"].includes(
                            connection?.effectiveType ?? ""
                        ) &&
                        workspaceRevision() === revision &&
                        client.getQueryData(referenceKey) !== undefined &&
                        client.getQueryData(visibleKey) !== undefined
                    )
                },
                onError: (error) => {
                    if (!(error instanceof WorkspaceReadError)) return
                    if (error.status === 409)
                        publishWorkspaceEvent({ type: "changed" })
                    if (error.redirectTo) {
                        void clearWorkspaceCache()
                        router.replace(error.redirectTo)
                    }
                },
            }
        )
        const cacheEvent = (event: Event) => {
            if (
                (event as CustomEvent<WorkspaceCacheEvent>).detail?.type ===
                "logout"
            )
                prefetch.stop()
            else prefetch.resume()
        }
        document.addEventListener("visibilitychange", prefetch.resume)
        window.addEventListener("online", prefetch.resume)
        window.addEventListener("focus", prefetch.resume)
        window.addEventListener(WORKSPACE_CACHE_EVENT, cacheEvent)
        return () => {
            const base = `/dashboard/accounts/${accountId}`
            const destination = window.location.pathname
            prefetch.stop({
                cancelInactive:
                    workspaceRevision() !== revision ||
                    (destination !== base &&
                        destination !== `${base}/transactions`),
            })
            document.removeEventListener("visibilitychange", prefetch.resume)
            window.removeEventListener("online", prefetch.resume)
            window.removeEventListener("focus", prefetch.resume)
            window.removeEventListener(WORKSPACE_CACHE_EVENT, cacheEvent)
        }
    }, [
        client,
        router,
        accountId,
        pathname,
        search,
        userId,
        revision,
        ready,
        today,
    ])
    return null
}
