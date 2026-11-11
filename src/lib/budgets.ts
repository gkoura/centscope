import {
    budgetCadences,
    isBudgetCadence,
    type BudgetCadence,
} from "@/lib/budget-period"
import { sameOrder, validateListOrder } from "@/lib/list-order"
import "server-only"
import { prisma } from "@/lib/prisma"
import { lockFinancialAccess } from "@/lib/financial-access"
import { requireVerifiedSession } from "@/lib/auth/session"
import { type BudgetInput } from "@/lib/budget-input"

export class BudgetWriteError extends Error {}

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
                      recurrence: true,
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
        const last =
            !input.id || existing?.recurrence !== input.recurrence
                ? await tx.recurringBudget.aggregate({
                      where: {
                          financialAccountId: input.financialAccountId,
                          recurrence: input.recurrence,
                      },
                      _max: { sortOrder: true },
                  })
                : null
        const sortOrder = last ? (last._max.sortOrder ?? -1) + 1 : undefined
        let budgetId = input.id
        if (input.id) {
            const result = await tx.recurringBudget.updateMany({
                where: {
                    id: input.id,
                    financialAccountId: input.financialAccountId,
                    version: input.version,
                },
                data: { ...data, sortOrder, version: { increment: 1 } },
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
                    sortOrder,
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

export async function reorderBudgetItems(
    accountId: string,
    cadence: BudgetCadence | null,
    raw: unknown
) {
    const input = validateListOrder(raw)
    if (!input)
        throw new BudgetWriteError("Invalid order. Reload and try again.")
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(
        async (tx) => {
            await lockFinancialAccess(tx, accountId, user.id)
            if (cadence === null) {
                if (!input.orderedIds.every(isBudgetCadence))
                    throw new BudgetWriteError("Invalid budget periods.")
                const account = await tx.financialAccount.findUniqueOrThrow({
                    where: { id: accountId },
                    select: { budgetCadenceOrder: true },
                })
                const plans = await tx.recurringBudget.findMany({
                    where: { financialAccountId: accountId },
                    select: { recurrence: true },
                })
                const present = new Set(plans.map((p) => p.recurrence))
                const order =
                    account.budgetCadenceOrder.length === 4
                        ? account.budgetCadenceOrder
                        : [...budgetCadences]
                const visible = order.filter((c) =>
                    present.has(c as BudgetCadence)
                )
                if (!sameOrder(visible, input.previousIds))
                    throw new BudgetWriteError(
                        "Budget periods changed. Cancel your draft and reload."
                    )
                let index = 0
                await tx.financialAccount.update({
                    where: { id: accountId },
                    data: {
                        budgetCadenceOrder: order.map((c) =>
                            present.has(c as BudgetCadence)
                                ? input.orderedIds[index++]
                                : c
                        ),
                    },
                })
            } else {
                const plans = await tx.recurringBudget.findMany({
                    where: {
                        financialAccountId: accountId,
                        recurrence: cadence,
                    },
                    orderBy: [
                        { sortOrder: "asc" },
                        { createdAt: "asc" },
                        { id: "asc" },
                    ],
                    select: { id: true, sortOrder: true },
                })
                if (
                    !sameOrder(
                        plans.map((p) => p.id),
                        input.previousIds
                    )
                )
                    throw new BudgetWriteError(
                        "Budgets changed. Cancel your draft and reload."
                    )
                for (const [sortOrder, id] of input.orderedIds.entries())
                    if (plans.find((p) => p.id === id)?.sortOrder !== sortOrder)
                        await tx.recurringBudget.update({
                            where: { id },
                            data: { sortOrder, version: { increment: 1 } },
                        })
            }
        },
        { timeout: 15_000 }
    )
}
