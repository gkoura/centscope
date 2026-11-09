import "server-only"
import { prisma } from "@/lib/prisma"
import { financialAccess } from "@/lib/financial-access"
import { summarizePendingPayments } from "@/lib/pending-payments"

export async function getOwnedPendingPayments(accountId: string) {
    const { ownerId } = await financialAccess(accountId)
    const entries = await prisma.ledgerEntry.findMany({
        where: {
            financialAccountId: accountId,
            accountWallet: {
                financialAccount: { ownerId, archivedAt: null },
                wallet: { ownerId: ownerId },
            },
            transaction: { type: "EXPENSE", status: "PENDING" },
        },
        select: {
            id: true,
            amount: true,
            accountWallet: {
                select: { wallet: { select: { name: true, currency: true } } },
            },
            transaction: {
                select: {
                    id: true,
                    name: true,
                    occurredAt: true,
                    occurrence: { select: { id: true } },
                },
            },
        },
    })
    const today = new Date().toISOString().slice(0, 10)
    return summarizePendingPayments(
        entries.map((entry) => ({
            id: entry.id,
            transactionId: entry.transaction.id,
            name: entry.transaction.name,
            date: entry.transaction.occurredAt.toISOString().slice(0, 10),
            amount: entry.amount.abs().toFixed(2),
            currency: entry.accountWallet.wallet.currency,
            walletName: entry.accountWallet.wallet.name,
            recurring: !!entry.transaction.occurrence,
        })),
        today
    )
}
