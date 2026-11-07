import {
    parseTransactionFilters,
    type TransactionQuery,
} from "./transaction-filters.ts"
import { resolveAccountPeriod, periodQuery } from "./account-period.ts"

// Bump when persisted response shapes change (v2 adds income-category summaries).
export const WORKSPACE_CACHE_VERSION = 2
export const WORKSPACE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000
export const WORKSPACE_CACHE_MAX_BYTES = 20 * 1024 * 1024
export const WORKSPACE_CACHE_MAX_QUERIES = 60
export const WORKSPACE_REVISION_COOKIE = "fintrack-workspace-revision"
export const workspaceResources = [
    "accounts",
    "reference",
    "transactions",
    "activity",
    "balanceHistory",
    "monthlyTrends",
    "suggestions",
    "analysis",
    "transferWallets",
    "recurring",
] as const
export type WorkspaceResource = (typeof workspaceResources)[number]
export type WorkspaceRequest = {
    resource: WorkspaceResource
    accountId?: string
    query?: TransactionQuery
}

/** URL spelling/order and irrelevant form return URLs must not create duplicate cache entries. */
export function canonicalWorkspaceRequest(
    request: WorkspaceRequest,
    today: string
): WorkspaceRequest {
    const { resource, accountId } = request
    const query = request.query ?? {}
    let values: TransactionQuery = {}
    if (resource === "transactions" || resource === "activity") {
        const period = resolveAccountPeriod(query, today)
        values = { ...parseTransactionFilters(query), ...periodQuery(period) }
        if (period.view !== "custom") {
            delete values.from
            delete values.to
        }
        if (values.wallet)
            values.wallet = String(values.wallet).split(",").sort().join(",")
        if (resource === "transactions" && period.view !== "month")
            for (const key of ["before", "after"])
                if (typeof query[key] === "string")
                    values[key] = query[key].slice(0, 512)
    } else if (resource === "monthlyTrends") {
        const month = resolveAccountPeriod({ month: query.month }, today).month
        // Leave room for the 12-month window and maximum 120-month expense spread.
        values = {
            month:
                month >= "1901-01" && month <= "9998-12"
                    ? month
                    : today.slice(0, 7),
        }
    } else if (resource === "balanceHistory" || resource === "analysis") {
        values = {
            month: resolveAccountPeriod({ month: query.month }, today).month,
        }
        if (resource === "analysis") {
            values.mode = query.mode === "actual" ? "actual" : "smoothed"
            for (const key of ["currency", "wallet"])
                if (typeof query[key] === "string")
                    values[key] = query[key].slice(0, 128)
        }
    }
    return {
        resource,
        ...(resource !== "accounts" ? { accountId } : {}),
        query: Object.fromEntries(
            Object.entries(values)
                .filter(([, value]) => value)
                .sort(([a], [b]) => a.localeCompare(b))
        ),
    }
}

export function workspaceQueryKey(
    userId: string,
    revision: string,
    request: WorkspaceRequest
) {
    return [
        "workspace",
        WORKSPACE_CACHE_VERSION,
        userId,
        revision,
        request,
    ] as const
}

export function belongsToWorkspace(
    key: readonly unknown[],
    userId?: string,
    revision?: string
) {
    return (
        key[0] === "workspace" &&
        key[1] === WORKSPACE_CACHE_VERSION &&
        (userId === undefined || key[2] === userId) &&
        (revision === undefined || key[3] === revision)
    )
}
