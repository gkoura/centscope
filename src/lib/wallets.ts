import "server-only"

import { Prisma } from "@/generated/prisma/client"
import { requireVerifiedSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import type { WalletInput } from "@/lib/wallet-input"

export class WalletCreationError extends Error {}

export async function createOwnedWallet(input: WalletInput) {
    const { user } = await requireVerifiedSession()
    const amount = new Prisma.Decimal(input.openingBalance)
    const occurredAt = new Date(`${input.openingDate}T00:00:00.000Z`)
    const idempotencyKey = `wallet-opening:${input.requestId}`

    return prisma.$transaction(
        async (tx) => {
            // Serialize creation/retries against account archival or ownership changes.
            const allowed = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM financial_account
            WHERE id = ${input.financialAccountId} AND "ownerId" = ${user.id} AND "archivedAt" IS NULL
            FOR UPDATE
        `
            if (!allowed.length)
                throw new WalletCreationError("This account is unavailable.")

            const existing = await tx.wallet.findUnique({
                where: { id: input.requestId },
                select: {
                    ownerId: true,
                    name: true,
                    type: true,
                    currency: true,
                    archivedAt: true,
                    allocations: {
                        where: {
                            financialAccountId: input.financialAccountId,
                            archivedAt: null,
                        },
                        select: { id: true },
                    },
                },
            })
            if (existing) {
                const opening = await tx.transaction.findUnique({
                    where: {
                        createdById_idempotencyKey: {
                            createdById: user.id,
                            idempotencyKey,
                        },
                    },
                    select: {
                        type: true,
                        status: true,
                        occurredAt: true,
                        entries: {
                            select: { accountWalletId: true, amount: true },
                        },
                    },
                })
                const sameOpening = amount.isZero()
                    ? !opening
                    : opening?.type === "OPENING_BALANCE" &&
                      opening.status === input.openingStatus &&
                      opening.occurredAt.getTime() === occurredAt.getTime() &&
                      opening.entries.length === 1 &&
                      opening.entries[0].accountWalletId ===
                          existing.allocations[0]?.id &&
                      opening.entries[0].amount.equals(amount)
                if (
                    existing.ownerId !== user.id ||
                    existing.archivedAt ||
                    existing.name !== input.name ||
                    existing.type !== input.type ||
                    existing.currency !== input.currency ||
                    existing.allocations.length !== 1 ||
                    !sameOpening
                ) {
                    throw new WalletCreationError(
                        "This form was already used. Reload the page to create another wallet."
                    )
                }
                return
            }

            const wallet = await tx.wallet.create({
                data: {
                    id: input.requestId,
                    ownerId: user.id,
                    name: input.name,
                    type: input.type,
                    currency: input.currency,
                },
                select: { id: true },
            })
            const allocation = await tx.accountWallet.create({
                data: {
                    walletId: wallet.id,
                    financialAccountId: input.financialAccountId,
                },
                select: { id: true },
            })
            // A zero balance needs no financial movement.
            if (!amount.isZero()) {
                const transaction = await tx.transaction.create({
                    data: {
                        type: "OPENING_BALANCE",
                        status: input.openingStatus,
                        name: "Opening balance",
                        occurredAt,
                        createdById: user.id,
                        idempotencyKey,
                        entries: {
                            create: {
                                accountWalletId: allocation.id,
                                financialAccountId: input.financialAccountId,
                                amount,
                            },
                        },
                    },
                    select: { id: true },
                })
                await tx.transactionChange.create({
                    data: {
                        transactionId: transaction.id,
                        liveTransactionId: transaction.id,
                        actorId: user.id,
                        action: "CREATED",
                        snapshot: {
                            type: "OPENING_BALANCE",
                            financialAccountId: input.financialAccountId,
                            walletId: wallet.id,
                            accountWalletId: allocation.id,
                            currency: input.currency,
                            amount: input.openingBalance,
                            status: input.openingStatus,
                            occurredAt: occurredAt.toISOString(),
                        },
                    },
                })
            }
        },
        { timeout: 15_000 }
    )
}

export async function listOwnedAccountWallets(financialAccountId: string) {
    const { user } = await requireVerifiedSession()
    const allocations = await prisma.accountWallet.findMany({
        where: {
            financialAccountId,
            archivedAt: null,
            financialAccount: { ownerId: user.id, archivedAt: null },
            wallet: { archivedAt: null, ownerId: user.id },
        },
        select: {
            id: true,
            wallet: { select: { name: true, type: true, currency: true } },
            entries: {
                where: { transaction: { type: "OPENING_BALANCE" } },
                select: {
                    amount: true,
                    transaction: { select: { status: true, occurredAt: true } },
                },
            },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    if (!allocations.length) return []
    const balances = await prisma.ledgerEntry.groupBy({
        by: ["accountWalletId"],
        where: {
            accountWalletId: { in: allocations.map(({ id }) => id) },
            financialAccountId,
            accountWallet: {
                financialAccount: { ownerId: user.id, archivedAt: null },
                archivedAt: null,
            },
            transaction: { status: "POSTED" },
        },
        _sum: { amount: true },
    })
    const byId = new Map(
        balances.map((row) => [
            row.accountWalletId,
            row._sum.amount?.toFixed(2) ?? "0.00",
        ])
    )
    return allocations.map((allocation) => ({
        id: allocation.id,
        ...allocation.wallet,
        balance: byId.get(allocation.id) ?? "0.00",
        opening: allocation.entries[0]
            ? {
                  amount: allocation.entries[0].amount.toFixed(2),
                  status: allocation.entries[0].transaction.status,
                  date: allocation.entries[0].transaction.occurredAt
                      .toISOString()
                      .slice(0, 10),
              }
            : null,
    }))
}
