"use client"
import { useEffect, useSyncExternalStore } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
    canonicalWorkspaceRequest,
    workspaceQueryKey,
    type WorkspaceRequest,
    type WorkspaceResource,
} from "@/lib/workspace-cache-policy"
import type { WorkspaceData } from "@/lib/workspace-data"
import {
    clearWorkspaceCache,
    publishWorkspaceEvent,
} from "@/lib/workspace-cache-events"
import { useWorkspaceScope } from "./workspace-cache-provider"

export class WorkspaceReadError extends Error {
    constructor(
        public status: number,
        message: string,
        public redirectTo?: string
    ) {
        super(message)
    }
}
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
    const request = canonicalWorkspaceRequest(
        { resource, accountId, query },
        today || "2000-01-01"
    )
    const router = useRouter()
    const result = useQuery<WorkspaceData[R], WorkspaceReadError>({
        queryKey: workspaceQueryKey(userId, revision, request),
        enabled: ready && !!today && (resource === "accounts" || !!accountId),
        staleTime: resource === "accounts" ? 5 * 60_000 : 30_000,
        gcTime: 24 * 60 * 60_000,
        refetchOnMount: "always",
        refetchOnWindowFocus: "always",
        // Keep the same screen mounted while a committed write refreshes its data.
        // Never carry a value across users, accounts, periods, filters or resource types.
        placeholderData: (previous, previousQuery) =>
            previousQuery?.queryKey[2] === userId &&
            JSON.stringify(previousQuery.queryKey[4]) ===
                JSON.stringify(request)
                ? previous
                : undefined,
        retry: (count, error) => error.status >= 500 && count < 1,
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams({ resource })
            if (accountId) params.set("accountId", accountId)
            for (const [key, value] of Object.entries(request.query ?? {}))
                if (typeof value === "string") params.set(key, value)
            const response = await fetch(`/api/workspace?${params}`, {
                signal,
                cache: "no-store",
                headers: {
                    "X-Fintrack-User": userId,
                    "X-Fintrack-Revision": revision,
                },
            })
            if (!response.ok) {
                const error = await response.json().catch(() => ({}))
                if (response.status === 409)
                    publishWorkspaceEvent({ type: "changed" })
                throw new WorkspaceReadError(
                    response.status,
                    error.message ?? "Couldn’t refresh your workspace.",
                    error.redirectTo
                )
            }
            const body = await response.json()
            if (body.userId !== userId || body.revision !== revision)
                throw new WorkspaceReadError(
                    409,
                    "Your workspace changed. Refreshing…"
                )
            return body.data as WorkspaceData[R]
        },
    })
    const denied =
        !!result.error && [401, 403, 404, 409].includes(result.error.status)
    useEffect(() => {
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
