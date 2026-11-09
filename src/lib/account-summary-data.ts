import "server-only"
import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { financialAccess } from "@/lib/financial-access"
import { summarizeActivity } from "@/lib/account-summary"
import { nextDay } from "@/lib/account-period"
import {
    walletFilterIds,
    type TransactionFilters,
} from "@/lib/transaction-filters"

export const getOwnedAccountActivity = cache(
    async (financialAccountId: string, filters: TransactionFilters) => {
        const { ownerId } = await financialAccess(financialAccountId)
        const selectedWallets = walletFilterIds(filters.wallet)
        const entries = await prisma.ledgerEntry.findMany({
            where: {
                financialAccountId,
                accountWallet: {
                    financialAccount: { ownerId, archivedAt: null },
                    wallet: { ownerId: ownerId },
                },
                ...(selectedWallets.length
                    ? { accountWalletId: { in: selectedWallets } }
                    : {}),
                ...(filters.category
                    ? {
                          category: {
                              OR: [
                                  { id: filters.category },
                                  { parentId: filters.category },
                              ],
                          },
                      }
                    : {}),
                transaction: {
                    ...(filters.type ? { type: filters.type } : {}),
                    ...(filters.status ? { status: filters.status } : {}),
                    ...(filters.q
                        ? {
                              OR: [
                                  {
                                      name: {
                                          contains: filters.q,
                                          mode: "insensitive",
                                      },
                                  },
                                  {
                                      notes: {
                                          contains: filters.q,
                                          mode: "insensitive",
                                      },
                                  },
                              ],
                          }
                        : {}),
                    occurredAt: {
                        ...(filters.from
                            ? { gte: new Date(`${filters.from}T00:00:00Z`) }
                            : {}),
                        ...(filters.to ? { lt: nextDay(filters.to) } : {}),
                    },
                },
            },
            orderBy: [
                { accountWallet: { sortOrder: "asc" } },
                { accountWalletId: "asc" },
                { id: "asc" },
            ],
            select: {
                amount: true,
                accountWalletId: true,
                accountWallet: {
                    select: {
                        wallet: { select: { name: true, currency: true } },
                    },
                },
                category: {
                    select: { name: true, parent: { select: { name: true } } },
                },
                transaction: { select: { id: true, type: true, status: true } },
            },
        })
        return summarizeActivity(
            entries.map((entry) => ({
                transactionId: entry.transaction.id,
                type: entry.transaction.type,
                status: entry.transaction.status,
                amount: entry.amount.toFixed(2),
                walletId: entry.accountWalletId,
                walletName: entry.accountWallet.wallet.name,
                currency: entry.accountWallet.wallet.currency,
                parentCategory:
                    entry.category?.parent?.name ??
                    entry.category?.name ??
                    null,
                category: entry.category
                    ? `${entry.category.parent ? `${entry.category.parent.name} / ` : ""}${entry.category.name}`
                    : null,
            })),
            filters.status === "PENDING" ? "PENDING" : "POSTED"
        )
    }
)
