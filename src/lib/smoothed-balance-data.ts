import "server-only"
import { prisma } from "@/lib/prisma"
import { financialAccess } from "@/lib/financial-access"
import { shiftMonth } from "@/lib/expense-spread"
import { smoothedBalanceHistory } from "@/lib/smoothed-balance"

export async function getOwnedSmoothedBalanceHistory(
    accountId: string,
    endMonth: string,
    currencies: string[]
) {
    const { ownerId } = await financialAccess(accountId)
    const entries = await prisma.$transaction(
        (db) =>
            db.ledgerEntry.findMany({
                where: {
                    financialAccountId: accountId,
                    accountWallet: {
                        archivedAt: null,
                        financialAccount: {
                            ownerId,
                            archivedAt: null,
                        },
                        wallet: { ownerId, archivedAt: null },
                    },
                    transaction: {
                        status: "POSTED",
                        OR: [
                            {
                                occurredAt: {
                                    lt: new Date(
                                        `${shiftMonth(endMonth, 1)}-01T00:00:00Z`
                                    ),
                                },
                            },
                            {
                                type: "EXPENSE",
                                expenseSpread: {
                                    startMonth: { lte: endMonth },
                                },
                            },
                        ],
                    },
                },
                select: {
                    amount: true,
                    accountWallet: {
                        select: { wallet: { select: { currency: true } } },
                    },
                    transaction: {
                        select: {
                            type: true,
                            status: true,
                            occurredAt: true,
                            expenseSpread: true,
                        },
                    },
                },
            }),
        { isolationLevel: "RepeatableRead", maxWait: 10_000, timeout: 15_000 }
    )
    return smoothedBalanceHistory(
        entries.map((entry) => ({
            type: entry.transaction.type,
            status: entry.transaction.status,
            amount: entry.amount.toFixed(2),
            currency: entry.accountWallet.wallet.currency,
            date: entry.transaction.occurredAt.toISOString().slice(0, 10),
            spread: entry.transaction.expenseSpread,
        })),
        endMonth,
        currencies
    )
}
