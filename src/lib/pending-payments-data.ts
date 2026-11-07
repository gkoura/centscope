import "server-only"
import { prisma } from "@/lib/prisma"
import { requireVerifiedSession } from "@/lib/auth/session"
import { summarizePendingPayments } from "@/lib/pending-payments"

export async function getOwnedPendingPayments(accountId: string) {
    const { user } = await requireVerifiedSession()
    const entries = await prisma.ledgerEntry.findMany({
        where: {
            financialAccountId: accountId,
            accountWallet: {
                financialAccount: { ownerId: user.id, archivedAt: null },
                wallet: { ownerId: user.id },
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
