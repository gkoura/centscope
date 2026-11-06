import "server-only"
import { prisma } from "@/lib/prisma"

/** Called only after Better Auth verifies the signed-in user's deletion token. */
export async function deleteAccountData(userId: string) {
    await prisma.$transaction(
        async (tx) => {
            // Lock the identity so new FK references cannot race the final deletion.
            await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${userId} FOR UPDATE`

            const foreignEntry = await tx.ledgerEntry.findFirst({
                where: {
                    transaction: { createdById: userId },
                    accountWallet: {
                        financialAccount: { ownerId: { not: userId } },
                    },
                },
                select: { id: true },
            })
            if (foreignEntry) {
                throw new Error(
                    "Account deletion requires resolving shared financial history first."
                )
            }

            await tx.recurrenceOccurrence.deleteMany({
                where: { rule: { createdById: userId } },
            })
            await tx.recurrenceRule.deleteMany({
                where: { createdById: userId },
            })
            await tx.transaction.deleteMany({ where: { createdById: userId } })
            // Audit snapshots intentionally survive ordinary transaction deletion,
            // but are removed when their author's entire identity is erased.
            await tx.transactionChange.deleteMany({
                where: { actorId: userId },
            })
            await tx.accountWallet.deleteMany({
                where: { financialAccount: { ownerId: userId } },
            })
            // The category self-reference is RESTRICT, so remove children first.
            await tx.category.deleteMany({
                where: {
                    financialAccount: { ownerId: userId },
                    parentId: { not: null },
                },
            })
            await tx.category.deleteMany({
                where: { financialAccount: { ownerId: userId } },
            })
            await tx.financialAccount.deleteMany({ where: { ownerId: userId } })
            await tx.wallet.deleteMany({ where: { ownerId: userId } })
            await tx.verification.deleteMany({
                where: {
                    OR: [
                        { value: userId },
                        {
                            identifier: {
                                in: [userId, `reset-password:${userId}`],
                            },
                        },
                    ],
                },
            })
            // Include the identity in this transaction: any remaining foreign-key
            // reference rolls back financial cleanup as well as session removal.
            // Better Auth's subsequent deletion is idempotent and clears its cookie.
            await tx.user.delete({ where: { id: userId } })
        },
        { isolationLevel: "Serializable", timeout: 30_000 }
    )
}
