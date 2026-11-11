"use client"
import { useEffect, useSyncExternalStore } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import type {
    WorkspaceRequest,
    WorkspaceResource,
} from "@/lib/workspace-cache-policy"
import { workspaceReadRejected } from "@/lib/workspace-cache-policy"
import { workspaceQueryOptions } from "@/lib/workspace-query-options"
export { WorkspaceReadError } from "@/lib/workspace-query-options"
import {
    clearWorkspaceCache,
    publishWorkspaceEvent,
} from "@/lib/workspace-cache-events"
import { useWorkspaceScope } from "./workspace-cache-provider"

function subscribeDay(update: () => void) {
    const timer = setInterval(update, 60_000)
    window.addEventListener("focus", update)
    return () => {
        clearInterval(timer)
        window.removeEventListener("focus", update)
    }
}
const utcDay = () => new Date().toISOString().slice(0, 10)
export function useWorkspaceDay() {
    return useSyncExternalStore(subscribeDay, utcDay, () => "")
}

export function useWorkspaceQuery<R extends WorkspaceResource>(
    resource: R,
    accountId?: string,
    query?: WorkspaceRequest["query"]
) {
    const { userId, revision, ready } = useWorkspaceScope()
    const today = useWorkspaceDay()
    const options = workspaceQueryOptions(
        { userId, revision },
        { resource, accountId, query },
        today || "2000-01-01"
    )
    const request = options.queryKey[4]
    const router = useRouter()
    const result = useQuery({
        ...options,
        enabled: ready && !!today && (resource === "accounts" || !!accountId),
        // Keep the same screen mounted while a committed write refreshes its data.
        // Never carry a value across users, accounts, periods, filters or resource types.
        placeholderData: (previous, previousQuery) =>
            previousQuery?.queryKey[2] === userId &&
            JSON.stringify(previousQuery.queryKey[4]) ===
                JSON.stringify(request)
                ? previous
                : undefined,
    })
    const denied = workspaceReadRejected(result.error)
    useEffect(() => {
        if (result.error?.status === 409)
            publishWorkspaceEvent({ type: "changed" })
        if (result.error?.redirectTo) {
            void clearWorkspaceCache()
            router.replace(result.error.redirectTo)
        }
    }, [result.error, router])
    // Never render saved data for an unverified, switched, expired or rejected identity.
    return {
        ...result,
        data:
            userId && !denied && (ready || result.isPlaceholderData)
                ? result.data
                : undefined,
    }
}
