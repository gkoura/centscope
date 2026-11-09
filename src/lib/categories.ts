import "server-only"
import { lockFinancialAccess, financialAccess } from "@/lib/financial-access"

import { requireVerifiedSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import {
    categoryOrderMatches,
    parseCategoryNames,
    validateCategoryOrderBatch,
    type CategoryOrderBatchInput,
    type CategoryOrderInput,
    type CategoryInput,
} from "@/lib/category-input"
import type { Prisma } from "@/generated/prisma/client"

export class CategoryWriteError extends Error {}

async function lockAccount(
    tx: Prisma.TransactionClient,
    financialAccountId: string,
    userId: string
) {
    await lockFinancialAccess(tx, financialAccountId, userId)
}

export async function listOwnedAccountCategories(financialAccountId: string) {
    const { ownerId } = await financialAccess(financialAccountId)
    const categories = await prisma.category.findMany({
        where: {
            financialAccountId,
            archivedAt: null,
            financialAccount: { ownerId, archivedAt: null },
        },
        select: {
            id: true,
            name: true,
            type: true,
            parentId: true,
            updatedAt: true,
            sortOrder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    })
    // A parent archived outside the normal service must not expose orphan choices.
    const roots = new Set(
        categories.filter((category) => !category.parentId).map(({ id }) => id)
    )
    return categories
        .filter(
            (category) => !category.parentId || roots.has(category.parentId)
        )
        .map((category) => ({
            ...category,
            updatedAt: category.updatedAt.toISOString(),
        }))
}

export async function createOwnedCategory(
    input: CategoryInput,
    names = [input.name]
) {
    const parsed = parseCategoryNames(
        names.join("\n"),
        input.parentId ? "subcategories" : "categories"
    )
    if (parsed.error) throw new CategoryWriteError(parsed.error)
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(
        async (tx) => {
            await lockAccount(tx, input.financialAccountId, user.id)
            if (input.parentId) {
                const parent = await tx.category.findFirst({
                    where: {
                        id: input.parentId,
                        financialAccountId: input.financialAccountId,
                        type: input.type,
                        parentId: null,
                        archivedAt: null,
                    },
                    select: { id: true },
                })
                if (!parent)
                    throw new CategoryWriteError(
                        "Choose an active top-level category of the same type."
                    )
            }
            const last = await tx.category.aggregate({
                where: {
                    financialAccountId: input.financialAccountId,
                    type: input.type,
                    parentId: input.parentId,
                    archivedAt: null,
                },
                _max: { sortOrder: true },
            })
            await tx.category.createMany({
                data: parsed.names.map((name, index) => ({
                    ...input,
                    name,
                    sortOrder: (last._max.sortOrder ?? -1) + 1 + index,
                })),
            })
        },
        { timeout: 15_000 }
    )
}

export async function changeOwnedCategory(
    input: {
        financialAccountId: string
        categoryId: string
        expectedUpdatedAt: string
        name: string
    },
    archive: boolean
) {
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(
        async (tx) => {
            await lockAccount(tx, input.financialAccountId, user.id)
            const category = await tx.category.findFirst({
                where: {
                    id: input.categoryId,
                    financialAccountId: input.financialAccountId,
                },
                select: {
                    id: true,
                    archivedAt: true,
                    updatedAt: true,
                    parentId: true,
                },
            })
            if (!category || (category.archivedAt && !archive))
                throw new CategoryWriteError("This category is unavailable.")
            if (category.archivedAt && archive) return
            if (category.updatedAt.toISOString() !== input.expectedUpdatedAt)
                throw new CategoryWriteError(
                    "This category changed. Refresh the page before trying again."
                )
            const updatedAt = new Date(
                Math.max(Date.now(), category.updatedAt.getTime() + 1)
            )
            if (archive) {
                // Children first: the database disallows active children under an archived root.
                await tx.category.updateMany({
                    where: {
                        financialAccountId: input.financialAccountId,
                        parentId: category.id,
                        archivedAt: null,
                    },
                    data: { archivedAt: updatedAt, updatedAt },
                })
            }
            await tx.category.update({
                where: { id: category.id },
                data: archive
                    ? { archivedAt: updatedAt, updatedAt }
                    : { name: input.name, updatedAt },
                select: { id: true },
            })
        },
        { timeout: 15_000 }
    )
}

export async function deleteOwnedCategory(input: {
    financialAccountId: string
    categoryId: string
    expectedUpdatedAt: string
}) {
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(
        async (tx) => {
            // Category and transaction writers use this same lock, so usage cannot
            // appear between checking the subtree and deleting it through the app.
            await lockAccount(tx, input.financialAccountId, user.id)
            const subtree = await tx.category.findMany({
                where: {
                    financialAccountId: input.financialAccountId,
                    OR: [
                        { id: input.categoryId },
                        { parentId: input.categoryId },
                    ],
                },
                select: { id: true, updatedAt: true },
            })
            const category = subtree.find(({ id }) => id === input.categoryId)
            if (!category)
                throw new CategoryWriteError("This category is unavailable.")
            if (category.updatedAt.toISOString() !== input.expectedUpdatedAt)
                throw new CategoryWriteError(
                    "This category changed. Refresh the page before trying again."
                )
            // Include archived children and every transaction status/date.
            const used = await tx.ledgerEntry.findFirst({
                where: { categoryId: { in: subtree.map(({ id }) => id) } },
                select: { id: true },
            })
            const recurringUse = await tx.recurrenceRule.findFirst({
                where: { categoryId: { in: subtree.map(({ id }) => id) } },
                select: { id: true },
            })
            if (used || recurringUse)
                throw new CategoryWriteError(
                    "This category or one of its subcategories is used by a transaction or recurring schedule and cannot be deleted."
                )
            // Keep restrictive FKs as a final safeguard. Delete children first;
            // any reference failure rolls back the entire subtree deletion.
            await tx.category.deleteMany({
                where: {
                    financialAccountId: input.financialAccountId,
                    parentId: category.id,
                },
            })
            await tx.category.delete({ where: { id: category.id } })
        },
        { timeout: 15_000 }
    )
}

async function applyCategoryOrder(
    tx: Prisma.TransactionClient,
    input: CategoryOrderInput
) {
    if (input.parentId) {
        const parent = await tx.category.findFirst({
            where: {
                id: input.parentId,
                financialAccountId: input.financialAccountId,
                type: input.type,
                parentId: null,
                archivedAt: null,
            },
            select: { id: true },
        })
        if (!parent)
            throw new CategoryWriteError(
                "This parent category is unavailable. Refresh and try again."
            )
    }
    const siblings = await tx.category.findMany({
        where: {
            financialAccountId: input.financialAccountId,
            type: input.type,
            parentId: input.parentId,
            archivedAt: null,
        },
        select: { id: true, sortOrder: true, updatedAt: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    })
    if (
        !categoryOrderMatches(
            siblings.map((c) => c.id),
            input.previousIds
        )
    )
        throw new CategoryWriteError(
            "These categories changed in another session. Cancel your draft to load the latest order, then try again."
        )
    if (categoryOrderMatches(input.orderedIds, input.previousIds)) return
    const byId = new Map(siblings.map((c) => [c.id, c]))
    for (const [sortOrder, id] of input.orderedIds.entries()) {
        const category = byId.get(id)!
        if (category.sortOrder !== sortOrder)
            await tx.category.update({
                where: { id },
                data: {
                    sortOrder,
                    updatedAt: new Date(
                        Math.max(Date.now(), category.updatedAt.getTime() + 1)
                    ),
                },
            })
    }
}

export async function reorderOwnedCategories(input: CategoryOrderInput) {
    return reorderOwnedCategoryGroups({
        financialAccountId: input.financialAccountId,
        groups: [input],
    })
}

export async function reorderOwnedCategoryGroups(raw: CategoryOrderBatchInput) {
    const { user } = await requireVerifiedSession()
    const input = validateCategoryOrderBatch(raw)
    if (!input)
        throw new CategoryWriteError(
            "Invalid category order. Cancel your draft and try again."
        )
    await prisma.$transaction(
        async (tx) => {
            await lockAccount(tx, input.financialAccountId, user.id)
            for (const group of input.groups) {
                await applyCategoryOrder(tx, {
                    ...group,
                    financialAccountId: input.financialAccountId,
                })
            }
        },
        { timeout: 15000 }
    )
}
