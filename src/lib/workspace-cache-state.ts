import type { DehydratedState } from "@tanstack/react-query"
import {
    belongsToWorkspace,
    workspaceReadRejected,
    WORKSPACE_CACHE_MAX_AGE,
    WORKSPACE_CACHE_MAX_BYTES,
    WORKSPACE_CACHE_MAX_QUERIES,
    WORKSPACE_CACHE_VERSION,
    type WorkspaceRequest,
} from "./workspace-cache-policy.ts"

export type SavedWorkspace = {
    version: number
    userId: string
    revision: string
    savedAt: number
    state: DehydratedState
}

export function restoredWorkspaceState(
    saved: SavedWorkspace | undefined,
    userId: string,
    revision: string,
    now: number
): DehydratedState | undefined {
    if (
        !saved ||
        saved.version !== WORKSPACE_CACHE_VERSION ||
        saved.userId !== userId ||
        saved.revision !== revision ||
        !Number.isFinite(saved.savedAt) ||
        saved.savedAt > now ||
        now - saved.savedAt >= WORKSPACE_CACHE_MAX_AGE ||
        !Array.isArray(saved.state?.queries)
    )
        return
    return {
        mutations: [],
        queries: saved.state.queries.filter(
            (query) =>
                belongsToWorkspace(query.queryKey, userId, revision) &&
                Number.isFinite(query.state.dataUpdatedAt) &&
                query.state.dataUpdatedAt <= now &&
                now - query.state.dataUpdatedAt < WORKSPACE_CACHE_MAX_AGE &&
                query.state.status === "success" &&
                !workspaceReadRejected(query.state.error)
        ),
    }
}

/** Persist only successful financial values, retaining the latest value if a background refresh failed. */
export function persistedWorkspaceState(
    state: DehydratedState,
    userId: string,
    revision: string
): DehydratedState {
    const candidates = state.queries
        .filter(
            (query) =>
                belongsToWorkspace(query.queryKey, userId, revision) &&
                query.state.data !== undefined &&
                !workspaceReadRejected(query.state.error)
        )
        .sort((a, b) => {
            // Hover-prefetched budget popups must not evict the period summaries
            // and reference data needed for navigation. Recency breaks ties.
            const detail = (query: typeof a) =>
                Number(
                    (query.queryKey[4] as WorkspaceRequest | undefined)
                        ?.resource === "budgetTransactions"
                )
            return (
                detail(a) - detail(b) ||
                b.state.dataUpdatedAt - a.state.dataUpdatedAt
            )
        })
    const queries: DehydratedState["queries"] = []
    let bytes = 1024 // Envelope and array separators.
    for (const query of candidates) {
        if (queries.length >= WORKSPACE_CACHE_MAX_QUERIES) break
        const saved = {
            ...query,
            state: {
                ...query.state,
                status: "success" as const,
                fetchStatus: "idle" as const,
                error: null,
                fetchFailureReason: null,
                fetchFailureCount: 0,
            },
        }
        const size = new TextEncoder().encode(JSON.stringify(saved)).byteLength
        if (bytes + size > WORKSPACE_CACHE_MAX_BYTES) continue
        queries.push(saved)
        bytes += size + 1
    }
    return { mutations: [], queries }
}
