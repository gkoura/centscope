import "server-only"
import { prisma } from "@/lib/prisma"
import { requireVerifiedSession } from "@/lib/auth/session"
import { analyzeMonth, type AnalysisExpense } from "@/lib/monthly-analysis"
import { shiftMonth } from "@/lib/expense-spread"

export async function getOwnedMonthlyAnalysis(
    accountId: string,
    month: string,
    mode: "smoothed" | "actual",
    currency: string,
    wallet?: string
) {
    const { user } = await requireVerifiedSession()
    const previousMonth = shiftMonth(month, -1)
    const end = new Date(`${shiftMonth(month, 1)}-01T00:00:00.000Z`)
    const start = new Date(`${previousMonth}-01T00:00:00.000Z`)
    const entries = await prisma.$transaction(
        (db) =>
            db.ledgerEntry.findMany({
                where: {
                    financialAccountId: accountId,
                    ...(wallet ? { accountWalletId: wallet } : {}),
                    accountWallet: {
                        financialAccount: {
                            ownerId: user.id,
                            archivedAt: null,
                        },
                        wallet: { currency, ownerId: user.id },
                    },
                    transaction: {
                        type: "EXPENSE",
                        status: "POSTED",
                        OR: [
                            { occurredAt: { gte: start, lt: end } },
                            ...(mode === "smoothed"
                                ? [
                                      {
                                          expenseSpread: {
                                              startMonth: {
                                                  gte: shiftMonth(
                                                      previousMonth,
                                                      -119
                                                  ),
                                                  lte: month,
                                              },
                                          },
                                      },
                                  ]
                                : []),
                        ],
                    },
                },
                select: {
                    amount: true,
                    category: {
                        select: {
                            name: true,
                            parent: { select: { name: true } },
                        },
                    },
                    accountWallet: {
                        select: {
                            wallet: { select: { name: true, currency: true } },
                        },
                    },
                    transaction: {
                        select: {
                            id: true,
                            name: true,
                            occurredAt: true,
                            expenseSpread: true,
                        },
                    },
                },
                orderBy: [
                    { transaction: { occurredAt: "desc" } },
                    { id: "asc" },
                ],
            }),
        { isolationLevel: "RepeatableRead", timeout: 15_000 }
    )
    const expenses: AnalysisExpense[] = entries.map((entry) => ({
        id: entry.transaction.id,
        name: entry.transaction.name,
        date: entry.transaction.occurredAt.toISOString().slice(0, 10),
        amount: entry.amount.abs().toFixed(2),
        currency: entry.accountWallet.wallet.currency,
        walletName: entry.accountWallet.wallet.name,
        category: entry.category
            ? `${entry.category.parent ? `${entry.category.parent.name} / ` : ""}${entry.category.name}`
            : "Uncategorized",
        spread: entry.transaction.expenseSpread,
    }))
    const today = new Date().toISOString().slice(0, 10)
    return {
        current: analyzeMonth(expenses, month, mode, today),
        previous: analyzeMonth(expenses, previousMonth, mode, today),
    }
}
