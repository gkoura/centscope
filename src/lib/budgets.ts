import {
    categorySelectionLabels,
    type CategorySelection,
} from "@/lib/category-selection"
import "server-only"
import { prisma } from "@/lib/prisma"
import { financialAccess, lockFinancialAccess } from "@/lib/financial-access"
import { requireVerifiedSession } from "@/lib/auth/session"
import { type BudgetInput } from "@/lib/budget-input"
import { budgetProgress } from "@/lib/budget-progress"
import { budgetPeriod, type BudgetCadence } from "@/lib/budget-period"

export class BudgetWriteError extends Error {}

export async function getRecurringBudgets(
    financialAccountId: string,
    recurrence: BudgetCadence,
    date: string
) {
    await financialAccess(financialAccountId)
    const period = budgetPeriod(recurrence, date)
    const [budgets, groups] = await Promise.all([
        prisma.recurringBudget.findMany({
            where: { financialAccountId },
            include: {
                categorySelections: {
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                                parentId: true,
                                archivedAt: true,
                                parent: {
                                    select: {
                                        id: true,
                                        name: true,
                                        parentId: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        }),
        prisma.ledgerEntry.groupBy({
            by: ["accountWalletId", "categoryId"],
            where: {
                financialAccountId,
                transaction: {
                    type: "EXPENSE",
                    status: "POSTED",
                    occurredAt: {
                        gte: new Date(`${period.from}T00:00:00Z`),
                        lt: new Date(`${period.until}T00:00:00Z`),
                    },
                },
            },
            _sum: { amount: true },
        }),
    ])
    // Include archived wallets/categories: archival never removes historical spending.
    const [wallets, categories] = await Promise.all([
        prisma.accountWallet.findMany({
            where: { financialAccountId },
            select: { id: true, wallet: { select: { currency: true } } },
        }),
        prisma.category.findMany({
            where: { financialAccountId },
            select: { id: true, parentId: true },
        }),
    ])
    const currencies = new Map(wallets.map((w) => [w.id, w.wallet.currency]))
    const parents = new Map(categories.map((c) => [c.id, c.parentId]))
    const spending = groups.map((entry) => ({
        currency: currencies.get(entry.accountWalletId) ?? "",
        categoryId: entry.categoryId,
        parentId: entry.categoryId
            ? (parents.get(entry.categoryId) ?? null)
            : null,
        amount: entry._sum.amount?.toFixed(2) ?? "0.00",
    }))
    const rows = budgets
        .filter((budget) => budget.recurrence === recurrence)
        .map((budget) => {
            const categorySelection: CategorySelection = {
                all: budget.allCategories,
                uncategorized: budget.includeUncategorized,
                categories: budget.categorySelections.map((item) => ({
                    categoryId: item.categoryId,
                    includeChildren: item.includeChildren,
                })),
            }
            const categoryChoices = budget.categorySelections.flatMap(
                (item) => [
                    {
                        id: item.category.id,
                        name:
                            item.category.name +
                            (item.category.archivedAt ? " (archived)" : ""),
                        parentId: item.category.parentId,
                    },
                    ...(item.category.parent ? [item.category.parent] : []),
                ]
            )
            const labels = categorySelectionLabels(
                categorySelection,
                categoryChoices
            )
            const progress = budgetProgress(
                budget.spendingLimit.toFixed(2),
                budget.currency,
                categorySelection,
                spending
            )
            return {
                id: budget.id,
                version: budget.version,
                name: budget.name,
                recurrence: budget.recurrence,
                currency: budget.currency,
                categorySelection,
                selectedCategories: categoryChoices,
                categoryLabel: categorySelection.all
                    ? "All expenses"
                    : `${labels.slice(0, 2).join(", ")}${labels.length > 2 ? ` +${labels.length - 2}` : ""}`,
                spendingLimit: budget.spendingLimit.toFixed(2),
                ...progress,
            }
        })
    return {
        budgets: rows,
        cadences: [...new Set(budgets.map((b) => b.recurrence))],
    }
}

export async function saveRecurringBudget(input: BudgetInput) {
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(async (tx) => {
        await lockFinancialAccess(tx, input.financialAccountId, user.id)
        const scopes = input.categorySelection.categories
        const existing = input.id
            ? await tx.recurringBudget.findFirst({
                  where: {
                      id: input.id,
                      financialAccountId: input.financialAccountId,
                  },
                  select: {
                      categorySelections: { select: { categoryId: true } },
                  },
              })
            : null
        const retained = new Set(
            existing?.categorySelections.map((c) => c.categoryId) ?? []
        )
        const categories = await tx.category.findMany({
            where: {
                id: { in: scopes.map((s) => s.categoryId) },
                financialAccountId: input.financialAccountId,
                type: "EXPENSE",
            },
            select: { id: true, parentId: true, archivedAt: true },
        })
        if (
            categories.length !== scopes.length ||
            scopes.some((scope) => {
                const category = categories.find(
                    (c) => c.id === scope.categoryId
                )
                return (
                    !category ||
                    (scope.includeChildren && category.parentId !== null) ||
                    (category.archivedAt && !retained.has(category.id))
                )
            })
        )
            throw new BudgetWriteError(
                "Choose expense categories from this account. Archived choices may only be retained."
            )
        const data = {
            name: input.name,
            allCategories: input.categorySelection.all,
            includeUncategorized: input.categorySelection.uncategorized,
            currency: input.currency,
            spendingLimit: input.spendingLimit,
            recurrence: input.recurrence,
        }
        let budgetId = input.id
        if (input.id) {
            const result = await tx.recurringBudget.updateMany({
                where: {
                    id: input.id,
                    financialAccountId: input.financialAccountId,
                    version: input.version,
                },
                data: { ...data, version: { increment: 1 } },
            })
            if (!result.count)
                throw new BudgetWriteError(
                    "This budget changed or was removed. Refresh and try again."
                )
        } else {
            const count = await tx.recurringBudget.count({
                where: {
                    financialAccountId: input.financialAccountId,
                },
            })
            if (count >= 100)
                throw new BudgetWriteError(
                    "You can create up to 100 budgets per account."
                )
            const created = await tx.recurringBudget.create({
                data: {
                    ...data,
                    financialAccountId: input.financialAccountId,
                },
                select: { id: true },
            })
            budgetId = created.id
        }
        await tx.recurringBudgetCategory.deleteMany({ where: { budgetId } })
        if (scopes.length)
            await tx.recurringBudgetCategory.createMany({
                data: scopes.map((scope) => ({
                    ...scope,
                    budgetId,
                    financialAccountId: input.financialAccountId,
                })),
            })
    })
}

export async function removeRecurringBudget(
    financialAccountId: string,
    id: string,
    version: number
) {
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(async (tx) => {
        await lockFinancialAccess(tx, financialAccountId, user.id)
        const result = await tx.recurringBudget.deleteMany({
            where: { financialAccountId, id, version },
        })
        if (!result.count)
            throw new BudgetWriteError(
                "This budget changed or was removed. Refresh and try again."
            )
    })
}
