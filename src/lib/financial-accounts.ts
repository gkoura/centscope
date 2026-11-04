import "server-only"
import {
    validateListOrder,
    sameOrder,
    type ListOrderInput,
} from "@/lib/list-order"
import { ListOrderError } from "@/lib/list-order-error"

import { requireVerifiedSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { defaultCategories } from "@/lib/category-input"

const accountSelect = { id: true, name: true, reportingCurrency: true } as const

// Derive ownership from the server session, never client input.
export async function listOwnedFinancialAccounts() {
    const { user } = await requireVerifiedSession()
    return prisma.financialAccount.findMany({
        where: { ownerId: user.id, archivedAt: null },
        select: accountSelect,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
    })
}

export async function getOwnedFinancialAccount(id: string) {
    const { user } = await requireVerifiedSession()
    return prisma.financialAccount.findFirst({
        where: { id, ownerId: user.id, archivedAt: null },
        select: accountSelect,
    })
}

export async function createOwnedFinancialAccount(data: {
    name: string
    reportingCurrency: string
}) {
    const { user } = await requireVerifiedSession()
    return prisma.$transaction(
        async (tx) => {
            // Serialize owner-list writes without blocking wallet FK checks.
            await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${user.id} FOR NO KEY UPDATE`
            const last = await tx.financialAccount.aggregate({
                where: { ownerId: user.id, archivedAt: null },
                _max: { sortOrder: true },
            })
            return tx.financialAccount.create({
                data: {
                    sortOrder: (last._max.sortOrder ?? -1) + 1,
                    name: data.name,
                    reportingCurrency: data.reportingCurrency,
                    ownerId: user.id,
                    createdById: user.id,
                    categories: {
                        createMany: {
                            data: defaultCategories.map((category) => ({
                                ...category,
                                sortOrder: defaultCategories
                                    .filter((c) => c.type === category.type)
                                    .map((c) => c.name)
                                    .sort()
                                    .indexOf(category.name),
                            })),
                        },
                    },
                },
                select: { id: true },
            })
        },
        { timeout: 15000 }
    )
}

export async function reorderOwnedFinancialAccounts(raw: ListOrderInput) {
    const { user } = await requireVerifiedSession()
    const input = validateListOrder(raw)
    if (!input)
        throw new ListOrderError("Invalid account order. Cancel and try again.")
    await prisma.$transaction(
        async (tx) => {
            // Serialize owner-list writes without blocking wallet FK checks.
            await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${user.id} FOR NO KEY UPDATE`
            const accounts = await tx.financialAccount.findMany({
                where: { ownerId: user.id, archivedAt: null },
                select: { id: true, sortOrder: true },
                orderBy: [
                    { sortOrder: "asc" },
                    { createdAt: "desc" },
                    { id: "asc" },
                ],
            })
            if (
                !sameOrder(
                    accounts.map((item) => item.id),
                    input.previousIds
                )
            )
                throw new ListOrderError(
                    "Your accounts changed. Cancel to load the latest order, then try again."
                )
            if (sameOrder(input.previousIds, input.orderedIds)) return
            const byId = new Map(
                accounts.map((account) => [account.id, account])
            )
            for (const [sortOrder, id] of input.orderedIds.entries()) {
                if (byId.get(id)!.sortOrder !== sortOrder)
                    await tx.financialAccount.update({
                        where: { id },
                        data: { sortOrder },
                    })
            }
        },
        { timeout: 15000 }
    )
}
