import "server-only"
import { cache } from "react"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireVerifiedSession } from "@/lib/auth/session"

export function accessibleAccount(userId: string) {
    return {
        archivedAt: null,
        OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
    }
}

export const financialAccess = cache(async (id: string) => {
    const { user } = await requireVerifiedSession()
    const account = await prisma.financialAccount.findFirst({
        where: { id, ...accessibleAccount(user.id) },
        select: { ownerId: true },
    })
    if (!account) throw new Error("This financial account is unavailable.")
    return {
        ownerId: account.ownerId,
        actorId: user.id,
        isOwner: account.ownerId === user.id,
    }
})

export async function lockFinancialAccess(
    tx: Prisma.TransactionClient,
    id: string,
    actorId: string
) {
    const [account] = await tx.$queryRaw<
        { ownerId: string }[]
    >`SELECT "ownerId" FROM financial_account WHERE id=${id} AND "archivedAt" IS NULL FOR UPDATE`
    if (
        !account ||
        (account.ownerId !== actorId &&
            !(await tx.accountMembership.findUnique({
                where: {
                    financialAccountId_userId: {
                        financialAccountId: id,
                        userId: actorId,
                    },
                },
                select: { userId: true },
            })))
    )
        throw new Error("This financial account is unavailable.")
    return account.ownerId
}

export function sharedAuditContext(
    ownerId: string,
    actorId: string,
    accountId: string
) {
    return ownerId === actorId ? {} : { sharedAccountId: accountId }
}
