import {
    budgetPeriod,
    isBudgetCadence,
    validBudgetDay,
} from "./budget-period.ts"
import {
    parseTransactionFilters,
    type TransactionQuery,
} from "./transaction-filters.ts"
import { resolveAccountPeriod, periodQuery } from "./account-period.ts"

// v9 removes budget history and health payloads while charts are deferred.
export const WORKSPACE_CACHE_VERSION = 9
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
    "pendingPayments",
    "budgets",
    "budgetInventory",
    "budgetTransactions",
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
    } else if (resource === "pendingPayments") {
        values = { day: today }
    } else if (resource === "monthlyTrends") {
        if (query.view === "all")
            return { resource, accountId, query: { view: "all" } }
        const month = resolveAccountPeriod({ month: query.month }, today).month
        // Leave room for the 12-month window and maximum 120-month expense spread.
        values = {
            month:
                month >= "1901-01" && month <= "9998-12"
                    ? month
                    : today.slice(0, 7),
        }
    } else if (resource === "budgets" || resource === "budgetTransactions") {
        const cadence = isBudgetCadence(query.cadence)
            ? query.cadence
            : "MONTHLY"
        const date =
            typeof query.date === "string" && validBudgetDay(query.date)
                ? query.date
                : today
        values = {
            cadence,
            date: budgetPeriod(cadence, date).from,
            mode: query.mode === "smoothed" ? "smoothed" : "actual",
        }
        if (resource === "budgetTransactions") {
            values.budgetId =
                typeof query.budgetId === "string"
                    ? query.budgetId.slice(0, 128)
                    : ""
            const page = Number(query.page ?? 0)
            values.page = String(
                Number.isSafeInteger(page) && page >= 0 && page <= 10000
                    ? page
                    : 0
            )
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

/** Ownership limits disk persistence and its eviction budget, not shared memory reads. */
export function isOwnedWorkspaceQuery(
    key: readonly unknown[],
    userId: string,
    revision: string,
    ownedIds: ReadonlySet<string>
) {
    if (!belongsToWorkspace(key, userId, revision)) return false
    const request = key[4] as WorkspaceRequest | undefined
    return (
        request?.resource === "accounts" ||
        ownedIds.has(request?.accountId ?? "")
    )
}
