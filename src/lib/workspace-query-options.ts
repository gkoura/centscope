import { queryOptions } from "@tanstack/react-query"
import {
    canonicalWorkspaceRequest,
    workspaceQueryKey,
    type WorkspaceRequest,
    type WorkspaceResource,
} from "./workspace-cache-policy.ts"
import type { WorkspaceData } from "./workspace-data"

export type WorkspaceQueryScope = { userId: string; revision: string }

export class WorkspaceReadError extends Error {
    status: number
    redirectTo?: string
    constructor(status: number, message: string, redirectTo?: string) {
        super(message)
        this.status = status
        this.redirectTo = redirectTo
    }
}

/** Demand reads and speculative reads must use the same keys, fetcher and freshness. */
export function workspaceQueryOptions<R extends WorkspaceResource>(
    scope: WorkspaceQueryScope,
    input: WorkspaceRequest & { resource: R },
    today: string,
    priority: RequestPriority = "auto"
) {
    const request = canonicalWorkspaceRequest(input, today)
    const { userId, revision } = scope
    return queryOptions<
        WorkspaceData[R],
        WorkspaceReadError,
        WorkspaceData[R],
        ReturnType<typeof workspaceQueryKey>
    >({
        queryKey: workspaceQueryKey(userId, revision, request),
        staleTime: request.resource === "accounts" ? 5 * 60_000 : 30_000,
        gcTime: 24 * 60 * 60_000,
        refetchOnMount: true,
        refetchOnWindowFocus: "always",
        retry: (count, error) => error.status >= 500 && count < 1,
        queryFn: async ({ signal, client }) => {
            const startedAt = Date.now()
            const params = new URLSearchParams({ resource: request.resource })
            if (request.accountId) params.set("accountId", request.accountId)
            for (const [key, value] of Object.entries(request.query ?? {}))
                if (typeof value === "string") params.set(key, value)
            const response = await fetch(`/api/workspace?${params}`, {
                signal,
                cache: "no-store",
                priority,
                headers: {
                    "X-Fintrack-User": userId,
                    "X-Fintrack-Revision": revision,
                },
            })
            if (!response.ok) {
                const error = await response.json().catch(() => ({}))
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
            signal.throwIfAborted()
            const data = body.data as WorkspaceData[R]
            // Transaction responses already include the exact period/filter
            // summary used by Analytics. Reuse it without refetching or copying
            // transaction rows into another cache entry. Cursors affect history only.
            if (request.resource === "transactions") {
                const activityKey = workspaceQueryKey(
                    userId,
                    revision,
                    canonicalWorkspaceRequest(
                        { ...request, resource: "activity" },
                        today
                    )
                )
                const existing = client.getQueryState(activityKey)
                if (
                    existing?.fetchStatus !== "fetching" &&
                    (existing?.dataUpdatedAt ?? 0) < startedAt
                )
                    client.setQueryData(
                        activityKey,
                        (data as WorkspaceData["transactions"]).activity
                    )
            }
            return data
        },
    })
}
