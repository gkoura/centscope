import "server-only"
import { listOwnedRecurringSummary } from "@/lib/recurring"
import {
    workspaceAccount,
    workspaceAccounts,
    workspaceWallets,
} from "@/lib/account-workspace"
import { listOwnedAccountCategories } from "@/lib/categories"
import {
    listOwnedAccountTransactions,
    listOwnedTransactionSuggestions,
} from "@/lib/transactions"
import { getOwnedAccountActivity } from "@/lib/account-summary-data"
import { getOwnedSmoothedBalanceHistory } from "@/lib/smoothed-balance-data"
import { getOwnedMonthlyTrends } from "@/lib/monthly-trends-data"
import { getOwnedMonthlyAnalysis } from "@/lib/monthly-analysis-data"
import { listOwnedTransferWallets } from "@/lib/transfers"
import { resolveAccountPeriod } from "@/lib/account-period"
import { parseTransactionFilters } from "@/lib/transaction-filters"
import type { WorkspaceRequest } from "@/lib/workspace-cache-policy"

type Account = Awaited<ReturnType<typeof workspaceAccount>>

async function reference(accountId: string, account: Account) {
    const [wallets, categories] = await Promise.all([
        workspaceWallets(accountId),
        listOwnedAccountCategories(accountId),
    ])
    return { account, wallets, categories }
}
async function transactions(
    accountId: string,
    query: NonNullable<WorkspaceRequest["query"]>
) {
    const period = resolveAccountPeriod(
        query,
        new Date().toISOString().slice(0, 10)
    )
    const filters = {
        ...parseTransactionFilters(query),
        from: period.from,
        to: period.to,
    }
    const [history, activity] = await Promise.all([
        listOwnedAccountTransactions(
            accountId,
            typeof query.before === "string" ? query.before : undefined,
            filters,
            {
                unpaginated: period.view === "month",
                pageSize: 50,
                after:
                    typeof query.after === "string" ? query.after : undefined,
            }
        ),
        getOwnedAccountActivity(accountId, filters),
    ])
    return { history, activity, period, filters }
}
async function balanceHistory(accountId: string, month: string) {
    const wallets = await workspaceWallets(accountId)
    return getOwnedSmoothedBalanceHistory(
        accountId,
        month,
        wallets.map((wallet) => wallet.currency)
    )
}
async function analysis(
    accountId: string,
    query: NonNullable<WorkspaceRequest["query"]>,
    account: Account
) {
    const wallets = await workspaceWallets(accountId)
    const month = String(query.month)
    const mode = query.mode === "actual" ? "actual" : "smoothed"
    const currency = ["EUR", "GBP", "USD"].includes(String(query.currency))
        ? String(query.currency)
        : account.reportingCurrency
    const wallet = wallets.some((item) => item.id === query.wallet)
        ? String(query.wallet)
        : ""
    return {
        account,
        wallets,
        month,
        mode,
        currency,
        wallet,
        ...(await getOwnedMonthlyAnalysis(
            accountId,
            month,
            mode,
            currency,
            wallet || undefined
        )),
    }
}

export type WorkspaceData = {
    accounts: Awaited<ReturnType<typeof workspaceAccounts>>
    reference: Awaited<ReturnType<typeof reference>>
    transactions: Awaited<ReturnType<typeof transactions>>
    activity: Awaited<ReturnType<typeof getOwnedAccountActivity>>
    balanceHistory: Awaited<ReturnType<typeof balanceHistory>>
    monthlyTrends: Awaited<ReturnType<typeof getOwnedMonthlyTrends>>
    suggestions: Awaited<ReturnType<typeof listOwnedTransactionSuggestions>>
    analysis: Awaited<ReturnType<typeof analysis>>
    transferWallets: Awaited<ReturnType<typeof listOwnedTransferWallets>>
    recurring: Awaited<ReturnType<typeof listOwnedRecurringSummary>>
}

export async function readWorkspaceData(
    request: WorkspaceRequest,
    account?: Account
): Promise<WorkspaceData[keyof WorkspaceData]> {
    if (request.resource === "accounts") return workspaceAccounts()
    // The API passes the already authorized account instead of looking it up again.
    if (!account || account.id !== request.accountId)
        throw new Error("An owned account is required.")
    const id = account.id
    const query = request.query ?? {}
    switch (request.resource) {
        case "reference":
            return reference(id, account)
        case "transactions":
            return transactions(id, query)
        case "activity": {
            const period = resolveAccountPeriod(
                query,
                new Date().toISOString().slice(0, 10)
            )
            return getOwnedAccountActivity(id, {
                ...parseTransactionFilters(query),
                from: period.from,
                to: period.to,
            })
        }
        case "balanceHistory":
            return balanceHistory(id, String(query.month))
        case "monthlyTrends":
            return getOwnedMonthlyTrends(id, String(query.month))
        case "suggestions":
            return listOwnedTransactionSuggestions(id)
        case "analysis":
            return analysis(id, query, account)
        case "transferWallets":
            return listOwnedTransferWallets(id)
        case "recurring":
            return listOwnedRecurringSummary(id)
    }
}
