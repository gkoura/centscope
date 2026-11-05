import "server-only"
import {
    validateListOrder,
    sameOrder,
    type ListOrderInput,
} from "@/lib/list-order"
import { ListOrderError } from "@/lib/list-order-error"

import { Prisma } from "@/generated/prisma/client"
import { requireVerifiedSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import type { WalletDetailsInput, WalletInput } from "@/lib/wallet-input"

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
            const last = await tx.accountWallet.aggregate({
                where: {
                    financialAccountId: input.financialAccountId,
                    archivedAt: null,
                    wallet: { archivedAt: null, ownerId: user.id },
                },
                _max: { sortOrder: true },
            })
            const allocation = await tx.accountWallet.create({
                data: {
                    sortOrder: (last._max.sortOrder ?? -1) + 1,
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
                            sortOrder: (last._max.sortOrder ?? -1) + 1,
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
    return prisma.$transaction(
        async (db) => {
            const allocations = await db.accountWallet.findMany({
                where: {
                    financialAccountId,
                    archivedAt: null,
                    financialAccount: { ownerId: user.id, archivedAt: null },
                    wallet: { archivedAt: null, ownerId: user.id },
                },
                select: {
                    id: true,
                    wallet: {
                        select: {
                            name: true,
                            type: true,
                            currency: true,
                            updatedAt: true,
                        },
                    },
                    entries: {
                        where: { transaction: { type: "OPENING_BALANCE" } },
                        select: {
                            amount: true,
                            transaction: {
                                select: {
                                    id: true,
                                    version: true,
                                    status: true,
                                    occurredAt: true,
                                },
                            },
                        },
                    },
                },
                orderBy: [
                    { sortOrder: "asc" },
                    { createdAt: "asc" },
                    { id: "asc" },
                ],
            })
            if (!allocations.length) return []
            const balances = await db.ledgerEntry.groupBy({
                by: ["accountWalletId"],
                where: {
                    accountWalletId: { in: allocations.map(({ id }) => id) },
                    financialAccountId,
                    accountWallet: {
                        financialAccount: {
                            ownerId: user.id,
                            archivedAt: null,
                        },
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
                updatedAt: allocation.wallet.updatedAt.toISOString(),
                balance: byId.get(allocation.id) ?? "0.00",
                opening: allocation.entries[0]
                    ? {
                          id: allocation.entries[0].transaction.id,
                          version: allocation.entries[0].transaction.version,
                          amount: allocation.entries[0].amount.toFixed(2),
                          status: allocation.entries[0].transaction.status,
                          date: allocation.entries[0].transaction.occurredAt
                              .toISOString()
                              .slice(0, 10),
                      }
                    : null,
            }))
        },
        { isolationLevel: "RepeatableRead", maxWait: 10_000, timeout: 15_000 }
    )
}

export async function reorderOwnedAccountWallets(
    financialAccountId: string,
    raw: ListOrderInput
) {
    const { user } = await requireVerifiedSession()
    const input = validateListOrder(raw)
    if (
        !input ||
        typeof financialAccountId !== "string" ||
        !financialAccountId ||
        financialAccountId.length > 128
    )
        throw new ListOrderError("Invalid wallet order. Cancel and try again.")
    await prisma.$transaction(
        async (tx) => {
            const allowed = await tx.$queryRaw<
                { id: string }[]
            >`SELECT id FROM financial_account WHERE id = ${financialAccountId} AND "ownerId" = ${user.id} AND "archivedAt" IS NULL FOR UPDATE`
            if (!allowed.length)
                throw new ListOrderError("This account is unavailable.")
            const wallets = await tx.accountWallet.findMany({
                where: {
                    financialAccountId,
                    archivedAt: null,
                    wallet: { archivedAt: null, ownerId: user.id },
                },
                select: { id: true, sortOrder: true },
                orderBy: [
                    { sortOrder: "asc" },
                    { createdAt: "asc" },
                    { id: "asc" },
                ],
            })
            if (
                !sameOrder(
                    wallets.map((item) => item.id),
                    input.previousIds
                )
            )
                throw new ListOrderError(
                    "These wallets changed. Cancel to load the latest order, then try again."
                )
            if (sameOrder(input.previousIds, input.orderedIds)) return
            const byId = new Map(wallets.map((wallet) => [wallet.id, wallet]))
            for (const [sortOrder, id] of input.orderedIds.entries()) {
                if (byId.get(id)!.sortOrder !== sortOrder)
                    await tx.accountWallet.update({
                        where: { id },
                        data: { sortOrder },
                    })
            }
        },
        { timeout: 15000 }
    )
}

export async function updateOwnedWallet(input: WalletDetailsInput) {
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(
        async (tx) => {
            const account = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM financial_account WHERE id = ${input.financialAccountId} AND "ownerId" = ${user.id} AND "archivedAt" IS NULL FOR UPDATE
        `
            if (!account.length)
                throw new WalletCreationError("This account is unavailable.")
            const rows = await tx.$queryRaw<
                {
                    id: string
                    name: string
                    type: string
                    currency: string
                    updatedAt: Date
                }[]
            >`
            SELECT w.id, w.name, w.type, w.currency, w."updatedAt" FROM account_wallet aw JOIN wallet w ON w.id = aw."walletId"
            WHERE aw.id = ${input.accountWalletId} AND aw."financialAccountId" = ${input.financialAccountId}
                AND aw."archivedAt" IS NULL AND w."archivedAt" IS NULL AND w."ownerId" = ${user.id}
            FOR UPDATE OF aw, w
        `
            const wallet = rows[0]
            if (!wallet)
                throw new WalletCreationError("This wallet is unavailable.")
            if (wallet.updatedAt.toISOString() !== input.expectedUpdatedAt)
                throw new WalletCreationError(
                    "This wallet changed. Close the dialog and refresh before editing again."
                )
            const openings = await tx.transaction.findMany({
                where: {
                    type: "OPENING_BALANCE",
                    entries: {
                        some: {
                            accountWalletId: input.accountWalletId,
                            financialAccountId: input.financialAccountId,
                        },
                    },
                },
                include: { entries: true },
                take: 2,
            })
            if (openings.length > 1)
                throw new WalletCreationError(
                    "This wallet has conflicting opening balances. Please contact support before editing."
                )
            const opening = openings[0],
                entry = opening?.entries[0]
            if (
                opening &&
                (opening.entries.length !== 1 ||
                    entry.accountWalletId !== input.accountWalletId ||
                    entry.financialAccountId !== input.financialAccountId)
            )
                throw new WalletCreationError(
                    "This opening balance is unavailable."
                )
            if (
                (opening?.id ?? null) !== input.expectedOpeningId ||
                (opening?.version ?? null) !== input.expectedOpeningVersion
            )
                throw new WalletCreationError(
                    "The opening balance changed. Close the dialog and refresh before editing again."
                )
            const amount = new Prisma.Decimal(input.openingBalance),
                occurredAt = new Date(`${input.openingDate}T00:00:00.000Z`)
            const changed = opening
                ? amount.isZero() ||
                  !entry.amount.equals(amount) ||
                  opening.status !== input.openingStatus ||
                  opening.occurredAt.getTime() !== occurredAt.getTime()
                : !amount.isZero()
            if (
                wallet.name === input.name &&
                wallet.type === input.type &&
                !changed
            )
                return
            if (changed) {
                const snapshot = (data: {
                    amount: string
                    date: string
                    status: string
                    version: number
                }) => ({
                    financialAccountId: input.financialAccountId,
                    accountWalletId: input.accountWalletId,
                    walletId: wallet.id,
                    currency: wallet.currency,
                    type: "OPENING_BALANCE",
                    ...data,
                })
                const before = opening
                    ? snapshot({
                          amount: entry.amount.toFixed(2),
                          date: opening.occurredAt.toISOString().slice(0, 10),
                          status: opening.status,
                          version: opening.version,
                      })
                    : null
                if (opening && amount.isZero()) {
                    await tx.transactionChange.create({
                        data: {
                            transactionId: opening.id,
                            liveTransactionId: opening.id,
                            actorId: user.id,
                            action: "OPENING_BALANCE_CLEARED",
                            snapshot: {
                                before,
                                after: {
                                    financialAccountId:
                                        input.financialAccountId,
                                    accountWalletId: input.accountWalletId,
                                    amount: "0.00",
                                },
                            },
                        },
                    })
                    await tx.transaction.delete({
                        where: { id: opening.id, version: opening.version },
                    })
                } else if (opening) {
                    await tx.transaction.update({
                        where: { id: opening.id, version: opening.version },
                        data: {
                            status: input.openingStatus,
                            occurredAt,
                            version: { increment: 1 },
                        },
                    })
                    await tx.ledgerEntry.update({
                        where: { id: entry.id },
                        data: { amount },
                    })
                    await tx.transactionChange.create({
                        data: {
                            transactionId: opening.id,
                            liveTransactionId: opening.id,
                            actorId: user.id,
                            action: "UPDATED",
                            snapshot: {
                                before,
                                after: snapshot({
                                    amount: amount.toFixed(2),
                                    date: input.openingDate,
                                    status: input.openingStatus,
                                    version: opening.version + 1,
                                }),
                            },
                        },
                    })
                } else {
                    const created = await tx.transaction.create({
                        data: {
                            type: "OPENING_BALANCE",
                            status: input.openingStatus,
                            name: "Opening balance",
                            occurredAt,
                            createdById: user.id,
                            idempotencyKey: `wallet-opening-edit:${input.accountWalletId}:${input.expectedUpdatedAt}`,
                            entries: {
                                create: {
                                    financialAccountId:
                                        input.financialAccountId,
                                    accountWalletId: input.accountWalletId,
                                    amount,
                                },
                            },
                        },
                        select: { id: true },
                    })
                    await tx.transactionChange.create({
                        data: {
                            transactionId: created.id,
                            liveTransactionId: created.id,
                            actorId: user.id,
                            action: "CREATED",
                            snapshot: snapshot({
                                amount: amount.toFixed(2),
                                date: input.openingDate,
                                status: input.openingStatus,
                                version: 1,
                            }),
                        },
                    })
                }
            }
            await tx.wallet.update({
                where: {
                    id: wallet.id,
                    updatedAt: new Date(input.expectedUpdatedAt),
                },
                data: {
                    name: input.name,
                    type: input.type,
                    updatedAt: new Date(
                        Math.max(Date.now(), wallet.updatedAt.getTime() + 1)
                    ),
                },
            })
        },
        { timeout: 15_000 }
    )
}
