import "server-only"
import { prisma } from "@/lib/prisma"
import { requireVerifiedSession } from "@/lib/auth/session"
import { shiftMonth } from "@/lib/expense-spread"
import {
    monthlyTrendBuckets,
    trendBounds,
    type TrendEntry,
} from "@/lib/monthly-trends"

export async function getOwnedMonthlyTrends(
    accountId: string,
    endMonth: string
) {
    const { user } = await requireVerifiedSession()
    const allTime = endMonth === "all"
    const startMonth = allTime ? "" : shiftMonth(endMonth, -11)
    const [entries, categories] = await prisma.$transaction(
        [
            prisma.ledgerEntry.findMany({
                where: {
                    financialAccountId: accountId,
                    accountWallet: {
                        archivedAt: null,
                        financialAccount: {
                            ownerId: user.id,
                            archivedAt: null,
                        },
                        wallet: { ownerId: user.id, archivedAt: null },
                    },
                    transaction: {
                        status: "POSTED",
                        type: { in: ["INCOME", "EXPENSE"] },
                        ...(allTime
                            ? {}
                            : {
                                  OR: [
                                      {
                                          occurredAt: {
                                              gte: new Date(
                                                  `${startMonth}-01T00:00:00Z`
                                              ),
                                              lt: new Date(
                                                  `${shiftMonth(endMonth, 1)}-01T00:00:00Z`
                                              ),
                                          },
                                      },
                                      {
                                          type: "EXPENSE",
                                          expenseSpread: {
                                              startMonth: {
                                                  gte: shiftMonth(
                                                      startMonth,
                                                      -119
                                                  ),
                                                  lte: endMonth,
                                              },
                                          },
                                      },
                                  ],
                              }),
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
                    financialAccount: { ownerId: user.id, archivedAt: null },
                },
                select: {
                    id: true,
                    name: true,
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
    const bounds = allTime
        ? trendBounds(rows, new Date().toISOString().slice(0, 7))
        : { startMonth, endMonth }
    return {
        categories,
        ...bounds,
        buckets: monthlyTrendBuckets(rows, bounds.endMonth, bounds.startMonth),
    }
}
