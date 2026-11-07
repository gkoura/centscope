import type { DehydratedState } from "@tanstack/react-query"
import {
    belongsToWorkspace,
    WORKSPACE_CACHE_MAX_AGE,
    WORKSPACE_CACHE_MAX_BYTES,
    WORKSPACE_CACHE_MAX_QUERIES,
    WORKSPACE_CACHE_VERSION,
} from "./workspace-cache-policy.ts"

export type SavedWorkspace = {
    version: number
    userId: string
    revision: string
    savedAt: number
    state: DehydratedState
}

function accessRejected(error: unknown) {
    return (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        [401, 403, 404, 409].includes(Number(error.status))
    )
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
                query.state.status === "success" &&
                !accessRejected(query.state.error)
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
                !accessRejected(query.state.error)
        )
        .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
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
