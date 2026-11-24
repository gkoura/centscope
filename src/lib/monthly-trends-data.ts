import "server-only"
import { prisma } from "@/lib/prisma"
import { financialAccess } from "@/lib/financial-access"
import { shiftMonth } from "@/lib/expense-spread"
import {
    monthlyTrendBuckets,
    rollingTrendBounds,
    trendBounds,
    type TrendEntry,
} from "@/lib/monthly-trends"

export async function getOwnedMonthlyTrends(
    accountId: string,
    completedEndMonth: string,
    includeCurrent = false
) {
    const { ownerId } = await financialAccess(accountId)
    const rolling =
        completedEndMonth === "all"
            ? null
            : rollingTrendBounds(completedEndMonth, includeCurrent)
    const [entries, categories] = await prisma.$transaction(
        [
            prisma.ledgerEntry.findMany({
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
                        type: { in: ["INCOME", "EXPENSE"] },
                        ...(rolling
                            ? {
                                  OR: [
                                      {
                                          occurredAt: {
                                              gte: new Date(
                                                  `${rolling.startMonth}-01T00:00:00Z`
                                              ),
                                              lt: new Date(
                                                  `${shiftMonth(rolling.endMonth, 1)}-01T00:00:00Z`
                                              ),
                                          },
                                      },
                                      {
                                          type: "EXPENSE",
                                          expenseSpread: {
                                              startMonth: {
                                                  gte: shiftMonth(
                                                      rolling.startMonth,
                                                      -119
                                                  ),
                                                  lte: rolling.endMonth,
                                              },
                                          },
                                      },
                                  ],
                              }
                            : {}),
                    },
                },
                select: {
                    amount: true,
                    categoryId: true,
                    accountWallet: {
                        select: { wallet: { select: { currency: true } } },
                    },
                    transaction: {
                        select: {
                            type: true,
                            occurredAt: true,
                            expenseSpread: {
                                select: { startMonth: true, monthCount: true },
                            },
                        },
                    },
                },
            }),
            // Include historic categories so archived labels can still be used to filter past activity.
            prisma.category.findMany({
                where: {
                    financialAccountId: accountId,
                    financialAccount: { ownerId, archivedAt: null },
                },
                select: {
                    id: true,
                    name: true,
                    iconKey: true,
                    type: true,
                    parentId: true,
                    sortOrder: true,
                },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
            }),
        ],
        { isolationLevel: "RepeatableRead" }
    )
    const rows: TrendEntry[] = entries.map((entry) => ({
        type: entry.transaction.type as "INCOME" | "EXPENSE",
        amount: entry.amount.toFixed(2),
        currency: entry.accountWallet.wallet.currency,
        month: entry.transaction.occurredAt.toISOString().slice(0, 7),
        categoryId: entry.categoryId,
        spread: entry.transaction.expenseSpread,
    }))
    const bounds =
        rolling ?? trendBounds(rows, new Date().toISOString().slice(0, 7))
    return {
        categories,
        ...bounds,
        buckets: monthlyTrendBuckets(rows, bounds.endMonth, bounds.startMonth),
    }
}
