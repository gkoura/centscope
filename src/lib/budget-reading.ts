import "server-only"
import { budgetComparison, budgetsInSectionOrder } from "@/lib/analytics-charts"
import { prisma } from "@/lib/prisma"
import { financialAccess } from "@/lib/financial-access"
import {
    categorySelectionLabels,
    matchesCategorySelection,
    type CategorySelection,
} from "@/lib/category-selection"
import { categoryEntryWhere, categoryFilterValue } from "@/lib/category-filter"
import {
    budgetPeriod,
    budgetCadenceLabels,
    budgetCadences,
    type BudgetCadence,
} from "@/lib/budget-period"
import { budgetContribution, type BudgetMode } from "@/lib/budget-contribution"
import { centsMoney, moneyCents, shiftMonth } from "@/lib/expense-spread"
import type { Prisma } from "@/generated/prisma/client"

const planInclude = {
    categorySelections: {
        include: {
            category: {
                select: {
                    id: true,
                    name: true,
                    parentId: true,
                    archivedAt: true,
                    parent: {
                        select: { id: true, name: true, parentId: true },
                    },
                },
            },
        },
    },
} satisfies Prisma.RecurringBudgetInclude
export class BudgetUnavailableError extends Error {}
function selectionOf(plan: {
    allCategories: boolean
    includeUncategorized: boolean
    categorySelections: { categoryId: string; includeChildren: boolean }[]
}): CategorySelection {
    return {
        all: plan.allCategories,
        uncategorized: plan.includeUncategorized,
        categories: plan.categorySelections.map((s) => ({
            categoryId: s.categoryId,
            includeChildren: s.includeChildren,
        })),
    }
}
function windowWhere(
    from: string,
    until: string,
    mode: BudgetMode
): Prisma.TransactionWhereInput {
    const payment = {
        occurredAt: {
            gte: new Date(`${from}T00:00:00Z`),
            lt: new Date(`${until}T00:00:00Z`),
        },
    }
    return {
        type: "EXPENSE",
        status: "POSTED",
        ...(mode === "actual"
            ? payment
            : {
                  OR: [
                      payment,
                      {
                          expenseSpread: {
                              startMonth: {
                                  gte: shiftMonth(from.slice(0, 7), -119),
                                  lte: until.slice(0, 7),
                              },
                          },
                      },
                  ],
              }),
    }
}
const orderBy = [
    { sortOrder: "asc" as const },
    { createdAt: "asc" as const },
    { id: "asc" as const },
]
export async function getBudgetInventory(accountId: string) {
    await financialAccess(accountId)
    const [account, plans] = await Promise.all([
        prisma.financialAccount.findUniqueOrThrow({
            where: { id: accountId },
            select: { budgetCadenceOrder: true },
        }),
        prisma.recurringBudget.findMany({
            where: { financialAccountId: accountId },
            orderBy,
            select: { id: true, name: true, recurrence: true },
        }),
    ])
    const cadenceOrder = account.budgetCadenceOrder.filter(
        (c): c is BudgetCadence => budgetCadences.includes(c as BudgetCadence)
    )
    return {
        cadenceOrder,
        groups: cadenceOrder
            .filter((c) => plans.some((p) => p.recurrence === c))
            .map((c) => ({ id: c, name: budgetCadenceLabels[c] + " budgets" })),
    }
}
export async function getRecurringBudgets(
    accountId: string,
    cadence: BudgetCadence,
    date: string,
    mode: BudgetMode = "actual"
) {
    await financialAccess(accountId)
    const current = budgetPeriod(cadence, date)
    const [plans, entries] = await prisma.$transaction(
        [
            prisma.recurringBudget.findMany({
                where: { financialAccountId: accountId, recurrence: cadence },
                include: planInclude,
                orderBy,
            }),
            prisma.ledgerEntry.findMany({
                where: {
                    financialAccountId: accountId,
                    transaction: windowWhere(current.from, current.until, mode),
                },
                select: {
                    amount: true,
                    categoryId: true,
                    category: { select: { parentId: true } },
                    accountWallet: {
                        select: { wallet: { select: { currency: true } } },
                    },
                    transaction: {
                        select: {
                            occurredAt: true,
                            expenseSpread: {
                                select: { startMonth: true, monthCount: true },
                            },
                        },
                    },
                },
            }),
        ],
        { isolationLevel: "RepeatableRead" }
    )
    const rows = entries
        .map((e) => ({
            amount: e.amount.negated().toFixed(2),
            categoryId: e.categoryId,
            parentId: e.category?.parentId ?? null,
            currency: e.accountWallet.wallet.currency,
            paidOn: e.transaction.occurredAt.toISOString().slice(0, 10),
            spread: e.transaction.expenseSpread,
        }))
        .map((row) => ({
            ...row,
            contribution: moneyCents(
                budgetContribution(
                    row.amount,
                    row.paidOn,
                    row.spread,
                    current,
                    mode
                ).amount
            ),
        }))
    const budgets = plans.map((plan) => {
        const categorySelection = selectionOf(plan)
        const matching = rows.filter(
            (e) =>
                e.currency === plan.currency &&
                matchesCategorySelection(
                    categorySelection,
                    e.categoryId,
                    e.parentId
                )
        )
        const spent = matching.reduce(
            (sum, row) => sum + row.contribution,
            BigInt(0)
        )
        const progress = {
            spent: centsMoney(spent),
            percentage:
                Number(
                    (spent * BigInt(10000)) /
                        moneyCents(plan.spendingLimit.toFixed(2))
                ) / 100,
        }
        const selectedCategories = plan.categorySelections.flatMap((s) => [
            {
                id: s.category.id,
                name:
                    s.category.name +
                    (s.category.archivedAt ? " (archived)" : ""),
                parentId: s.category.parentId,
            },
            ...(s.category.parent ? [s.category.parent] : []),
        ])
        const labels = categorySelectionLabels(
            categorySelection,
            selectedCategories
        )
        return {
            id: plan.id,
            name: plan.name,
            version: plan.version,
            sortOrder: plan.sortOrder,
            recurrence: plan.recurrence,
            currency: plan.currency,
            spendingLimit: plan.spendingLimit.toFixed(2),
            categorySelection,
            selectedCategories,
            categoryLabel: categorySelection.all
                ? "All expenses"
                : `${labels.slice(0, 2).join(", ")}${labels.length > 2 ? ` +${labels.length - 2}` : ""}`,
            spent: progress.spent,
            remaining: centsMoney(
                moneyCents(plan.spendingLimit.toFixed(2)) -
                    moneyCents(progress.spent)
            ),
            percentage: progress.percentage,
        }
    })
    return {
        budgets,
        period: current,
        mode,
    }
}
export async function getBudgetTransactions(
    accountId: string,
    budgetId: string,
    date: string,
    mode: BudgetMode,
    page = 0
) {
    await financialAccess(accountId)
    return prisma.$transaction(
        async (tx) => {
            const plan = await tx.recurringBudget.findFirst({
                where: { id: budgetId, financialAccountId: accountId },
                include: planInclude,
            })
            if (!plan)
                throw new BudgetUnavailableError(
                    "This budget was removed. Close this popup and refresh the page."
                )
            const period = budgetPeriod(plan.recurrence, date),
                categorySelection = selectionOf(plan)
            const entries = await tx.ledgerEntry.findMany({
                where: {
                    financialAccountId: accountId,
                    ...categoryEntryWhere(
                        categoryFilterValue(categorySelection)
                    ),
                    accountWallet: { wallet: { currency: plan.currency } },
                    transaction: windowWhere(period.from, period.until, mode),
                },
                select: {
                    amount: true,
                    category: {
                        select: {
                            name: true,
                            parent: { select: { name: true } },
                        },
                    },
                    accountWallet: {
                        select: { wallet: { select: { name: true } } },
                    },
                    transaction: {
                        select: {
                            id: true,
                            name: true,
                            occurredAt: true,
                            expenseSpread: {
                                select: { startMonth: true, monthCount: true },
                            },
                        },
                    },
                },
                orderBy: [
                    { transaction: { occurredAt: "desc" } },
                    { transactionId: "asc" },
                ],
            })
            const rows = entries.flatMap((entry) => {
                const originalAmount = entry.amount.negated().toFixed(2),
                    paidOn = entry.transaction.occurredAt
                        .toISOString()
                        .slice(0, 10)
                const contribution = budgetContribution(
                    originalAmount,
                    paidOn,
                    entry.transaction.expenseSpread,
                    period,
                    mode
                )
                if (moneyCents(contribution.amount) === BigInt(0)) return []
                return [
                    {
                        id: entry.transaction.id,
                        name: entry.transaction.name,
                        paidOn,
                        originalAmount,
                        contribution: contribution.amount,
                        allocations: contribution.allocations,
                        spread: entry.transaction.expenseSpread,
                        wallet: entry.accountWallet.wallet.name,
                        category: entry.category
                            ? `${entry.category.parent ? entry.category.parent.name + " / " : ""}${entry.category.name}`
                            : "Uncategorized",
                    },
                ]
            })
            return {
                name: plan.name,
                currency: plan.currency,
                period,
                mode,
                total: centsMoney(
                    rows.reduce(
                        (sum, row) => sum + moneyCents(row.contribution),
                        BigInt(0)
                    )
                ),
                count: rows.length,
                page,
                pageSize: 100,
                transactions: rows.slice(page * 100, (page + 1) * 100),
            }
        },
        { isolationLevel: "RepeatableRead", timeout: 15_000 }
    )
}

/** Same eligibility, category matching and expense allocation as budget progress. */
export async function getBudgetComparison(
    accountId: string,
    endMonth: string,
    mode: BudgetMode,
    includeCurrent = false
) {
    await financialAccess(accountId)
    const from = `${shiftMonth(endMonth, -11)}-01`
    const until = `${shiftMonth(endMonth, includeCurrent ? 2 : 1)}-01`
    const [plans, entries, account] = await prisma.$transaction(
        async (tx) => {
            // Await reads on this connection; do not queue concurrent transaction queries.
            const account = await tx.financialAccount.findUniqueOrThrow({
                where: { id: accountId },
                select: { budgetCadenceOrder: true },
            })
            const plans = await tx.recurringBudget.findMany({
                where: { financialAccountId: accountId },
                select: {
                    id: true,
                    name: true,
                    currency: true,
                    recurrence: true,
                    spendingLimit: true,
                    allCategories: true,
                    includeUncategorized: true,
                    categorySelections: {
                        select: { categoryId: true, includeChildren: true },
                    },
                },
                orderBy,
            })
            const entries = await tx.ledgerEntry.findMany({
                where: {
                    financialAccountId: accountId,
                    transaction: windowWhere(from, until, mode),
                },
                select: {
                    amount: true,
                    categoryId: true,
                    category: { select: { parentId: true } },
                    accountWallet: {
                        select: { wallet: { select: { currency: true } } },
                    },
                    transaction: {
                        select: {
                            occurredAt: true,
                            expenseSpread: {
                                select: { startMonth: true, monthCount: true },
                            },
                        },
                    },
                },
            })
            return [plans, entries, account] as const
        },
        { isolationLevel: "RepeatableRead", maxWait: 10_000, timeout: 15_000 }
    )
    return budgetComparison(
        budgetsInSectionOrder(plans, account.budgetCadenceOrder).map(
            (plan) => ({
                id: plan.id,
                name: plan.name,
                currency: plan.currency,
                recurrence: plan.recurrence,
                spendingLimit: plan.spendingLimit.toFixed(2),
                categorySelection: selectionOf(plan),
            })
        ),
        entries.map((entry) => ({
            amount: entry.amount.negated().toFixed(2),
            paidOn: entry.transaction.occurredAt.toISOString().slice(0, 10),
            categoryId: entry.categoryId,
            parentId: entry.category?.parentId ?? null,
            currency: entry.accountWallet.wallet.currency,
            spread: entry.transaction.expenseSpread,
        })),
        endMonth,
        mode,
        includeCurrent
    )
}
