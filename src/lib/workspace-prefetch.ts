import type { QueryClient } from "@tanstack/react-query"
import { shiftMonth, validMonth } from "./expense-spread.ts"
import { resolveAccountPeriod } from "./account-period.ts"
import type { TransactionQuery } from "./transaction-filters.ts"
import { analyticsPeriodInput } from "./analytics.ts"
import { trendEndMonth } from "./monthly-trends.ts"
import {
    canonicalWorkspaceRequest,
    type WorkspaceRequest,
} from "./workspace-cache-policy.ts"
import {
    workspaceQueryOptions,
    WorkspaceReadError,
    type WorkspaceQueryScope,
} from "./workspace-query-options.ts"

export function isWorkspacePrefetchRoute(accountId: string, pathname: string) {
    const base = `/dashboard/accounts/${accountId}`
    return [base, `${base}/transactions`, `${base}/analytics`].includes(
        pathname
    )
}

export function workspacePrefetchPlan(
    accountId: string,
    pathname: string,
    search: string,
    today: string
) {
    const base = `/dashboard/accounts/${accountId}`
    const overview = pathname === base
    const analytics = pathname === `${base}/analytics`
    if (!isWorkspacePrefetchRoute(accountId, pathname)) return null
    const params = new URLSearchParams(search)
    const query: TransactionQuery = {}
    for (const key of new Set(params.keys())) {
        const values = params.getAll(key)
        query[key] = values.length > 1 ? values : values[0]
    }
    const period = resolveAccountPeriod(
        overview
            ? { ...query, view: query.view === "all" ? "all" : "month" }
            : analytics
              ? analyticsPeriodInput(query)
              : query,
        today
    )
    if (period.view !== "month" && !analytics) return null
    const foreground: WorkspaceRequest = overview
        ? {
              resource: "reference",
              accountId,
          }
        : analytics
          ? {
                resource: "activity",
                accountId,
                query: analyticsPeriodInput(query),
            }
          : { resource: "transactions", accountId, query }
    return {
        foreground,
        requests: [
            ...(period.view === "month"
                ? transactionPrefetchRequests(accountId, period.month, today)
                : []),
            // The trends chart has its own rolling window, independent of the
            // selected activity period. Warm only its default, not every year.
            canonicalWorkspaceRequest(
                {
                    resource: "monthlyTrends",
                    accountId,
                    query: { month: trendEndMonth("rolling", today) },
                },
                today
            ),
        ],
    }
}

/** Preloading a response must not recursively expand the window or carry arbitrary filters. */
export function transactionPrefetchRequests(
    accountId: string,
    month: string,
    today: string
) {
    if (!validMonth(month) || month < "0002-01" || month > "9998-12") return []
    return [0, -1, -2, 1]
        .map((offset) => shiftMonth(month, offset))
        .filter(
            (value) =>
                validMonth(value) && value >= "0002-01" && value <= "9998-12"
        )
        .map((value) =>
            canonicalWorkspaceRequest(
                {
                    resource: "transactions",
                    accountId,
                    query: { view: "month", month: value },
                },
                today
            )
        )
}

type PrefetchEnvironment = {
    canRun: () => boolean
    scheduleIdle: (run: () => void) => () => void
    onError: (error: unknown) => void
}

/** One background request at a time, yielding between requests to visible work. */
export function startWorkspacePrefetch(
    client: QueryClient,
    scope: WorkspaceQueryScope,
    requests: WorkspaceRequest[],
    today: string,
    environment: PrefetchEnvironment
) {
    let stopped = false,
        running = false,
        next = 0
    let cancelIdle: (() => void) | undefined
    let currentKey:
        ReturnType<typeof workspaceQueryOptions>["queryKey"] | undefined
    const wake = () => {
        if (stopped || running || cancelIdle || next >= requests.length) return
        cancelIdle = environment.scheduleIdle(run)
    }
    const run = () => {
        cancelIdle = undefined
        if (
            stopped ||
            !environment.canRun() ||
            client.isFetching() ||
            client.isMutating()
        )
            return
        running = true
        const options = workspaceQueryOptions(
            scope,
            requests[next],
            today,
            "low"
        )
        currentKey = options.queryKey
        void client
            .query({ ...options, retry: false })
            .catch((error: unknown) => {
                if (stopped) return
                if (
                    error instanceof WorkspaceReadError &&
                    [401, 403, 404, 409].includes(error.status)
                )
                    stop()
                environment.onError(error)
            })
            .finally(() => {
                running = false
                currentKey = undefined
                next++
                wake()
            })
    }
    const unsubscribeQueries = client.getQueryCache().subscribe(wake)
    const unsubscribeMutations = client.getMutationCache().subscribe(wake)
    const stop = ({ cancelInactive = true } = {}) => {
        if (stopped) return
        stopped = true
        cancelIdle?.()
        unsubscribeQueries()
        unsubscribeMutations()
        // Route cleanup can precede the destination observer mounting. Keep that
        // request alive during same-account navigation so the observer can inherit it.
        if (cancelInactive && currentKey)
            void client.cancelQueries({
                queryKey: currentKey,
                exact: true,
                type: "inactive",
            })
    }
    wake()
    return { resume: wake, stop }
}
