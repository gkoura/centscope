import { moveBudgetPeriod, type BudgetCadence } from "./budget-period.ts"
import type { BudgetMode } from "./budget-contribution.ts"
import {
    canonicalWorkspaceRequest,
    type WorkspaceRequest,
} from "./workspace-cache-policy.ts"

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

/** Neighbors follow the visible cadence; speculative results never expand this window. */
export function budgetPrefetchRequests(
    accountId: string,
    ids: string[],
    cadence: BudgetCadence,
    date: string,
    mode: BudgetMode,
    today: string
): WorkspaceRequest[] {
    return [
        ...[-1, 1].flatMap((direction): WorkspaceRequest[] => {
            const neighbor = moveBudgetPeriod(cadence, date, direction)
            return neighbor
                ? [
                      {
                          resource: "budgets",
                          accountId,
                          query: { cadence, date: neighbor, mode },
                      },
                  ]
                : []
        }),
        ...ids
            .slice(0, 4)
            .map((id) =>
                budgetDetailRequest(accountId, id, cadence, date, mode)
            ),
    ].map((request) => canonicalWorkspaceRequest(request, today))
}
