import "server-only"

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
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
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
    return prisma.financialAccount.create({
        data: {
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
}
