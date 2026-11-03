import "server-only"

import { createHash } from "node:crypto"
import { Prisma } from "@/generated/prisma/client"
import { requireVerifiedSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import type { TransactionInput } from "@/lib/transaction-input"

export class TransactionWriteError extends Error {}

async function lockAccount(
    tx: Prisma.TransactionClient,
    accountId: string,
    userId: string
) {
    const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM financial_account WHERE id = ${accountId} AND "ownerId" = ${userId} AND "archivedAt" IS NULL FOR UPDATE
    `
    if (!rows.length)
        throw new TransactionWriteError("This account is unavailable.")
}

export async function createOwnedTransaction(input: TransactionInput) {
    const { user } = await requireVerifiedSession()
    const { requestId, ...payload } = input
    const fingerprint = createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex")
    const idempotencyKey = `manual:${requestId}`
    await prisma.$transaction(
        async (tx) => {
            await lockAccount(tx, input.financialAccountId, user.id)
            const allocations = await tx.$queryRaw<
                { id: string; currency: string }[]
            >`
            SELECT aw.id, w.currency FROM account_wallet aw JOIN wallet w ON w.id = aw."walletId"
            WHERE aw.id = ${input.accountWalletId} AND aw."financialAccountId" = ${input.financialAccountId}
              AND aw."archivedAt" IS NULL AND w."archivedAt" IS NULL AND w."ownerId" = ${user.id}
            FOR UPDATE OF aw, w
        `
            if (!allocations.length)
                throw new TransactionWriteError(
                    "This wallet is unavailable in this account."
                )
            const category = await tx.category.findFirst({
                where: {
                    id: input.categoryId,
                    financialAccountId: input.financialAccountId,
                    type: input.type,
                    archivedAt: null,
                    OR: [{ parentId: null }, { parent: { archivedAt: null } }],
                },
                select: { id: true },
            })
            if (!category)
                throw new TransactionWriteError(
                    "Choose an active category of the correct type in this account."
                )
            const existing = await tx.transaction.findUnique({
                where: {
                    createdById_idempotencyKey: {
                        createdById: user.id,
                        idempotencyKey,
                    },
                },
                select: {
                    changes: {
                        where: { action: "CREATED" },
                        select: { snapshot: true },
                        take: 1,
                    },
                },
            })
            if (existing) {
                const snapshot = existing.changes[0]?.snapshot
                if (
                    !snapshot ||
                    typeof snapshot !== "object" ||
                    Array.isArray(snapshot) ||
                    snapshot.requestFingerprint !== fingerprint
                )
                    throw new TransactionWriteError(
                        "This form was already used. Reload the page to create another transaction."
                    )
                return
            }
            const amount = new Prisma.Decimal(input.amount)
            const signedAmount =
                input.type === "EXPENSE" ? amount.negated() : amount
            const transaction = await tx.transaction.create({
                data: {
                    type: input.type,
                    name: input.name,
                    notes: input.notes,
                    status: input.status,
                    occurredAt: new Date(`${input.date}T00:00:00.000Z`),
                    createdById: user.id,
                    idempotencyKey,
                    entries: {
                        create: {
                            accountWalletId: input.accountWalletId,
                            financialAccountId: input.financialAccountId,
                            categoryId: input.categoryId,
                            amount: signedAmount,
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
                        ...payload,
                        amount: signedAmount.toFixed(2),
                        currency: allocations[0].currency,
                        version: 1,
                        requestFingerprint: fingerprint,
                    },
                },
            })
        },
        { timeout: 15_000 }
    )
}

export async function changeOwnedTransactionStatus(input: {
    financialAccountId: string
    transactionId: string
    status: "POSTED" | "PENDING"
    expectedVersion: number
}) {
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(
        async (tx) => {
            await lockAccount(tx, input.financialAccountId, user.id)
            const transaction = await tx.transaction.findFirst({
                where: {
                    id: input.transactionId,
                    type: { in: ["OPENING_BALANCE", "EXPENSE", "INCOME"] },
                    entries: {
                        some: { financialAccountId: input.financialAccountId },
                    },
                },
                select: {
                    id: true,
                    type: true,
                    status: true,
                    version: true,
                    entries: {
                        select: {
                            financialAccountId: true,
                            accountWalletId: true,
                            amount: true,
                            accountWallet: {
                                select: {
                                    archivedAt: true,
                                    wallet: {
                                        select: {
                                            ownerId: true,
                                            archivedAt: true,
                                            currency: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            })
            const entry = transaction?.entries[0]
            if (
                !transaction ||
                transaction.entries.length !== 1 ||
                !entry ||
                entry.financialAccountId !== input.financialAccountId ||
                entry.accountWallet.archivedAt ||
                entry.accountWallet.wallet.archivedAt ||
                entry.accountWallet.wallet.ownerId !== user.id
            )
                throw new TransactionWriteError(
                    "This transaction is unavailable."
                )
            if (transaction.version !== input.expectedVersion) {
                if (
                    transaction.version === input.expectedVersion + 1 &&
                    transaction.status === input.status
                )
                    return
                throw new TransactionWriteError(
                    "This transaction changed. Refresh the page before trying again."
                )
            }
            if (transaction.status === input.status) return
            const updated = await tx.transaction.updateMany({
                where: { id: transaction.id, version: input.expectedVersion },
                data: { status: input.status, version: { increment: 1 } },
            })
            if (updated.count !== 1)
                throw new TransactionWriteError(
                    "This transaction changed. Refresh the page before trying again."
                )
            await tx.transactionChange.create({
                data: {
                    transactionId: transaction.id,
                    liveTransactionId: transaction.id,
                    actorId: user.id,
                    action: "STATUS_CHANGED",
                    snapshot: {
                        financialAccountId: input.financialAccountId,
                        accountWalletId: entry.accountWalletId,
                        type: transaction.type,
                        amount: entry.amount.toFixed(2),
                        currency: entry.accountWallet.wallet.currency,
                        before: {
                            status: transaction.status,
                            version: transaction.version,
                        },
                        after: {
                            status: input.status,
                            version: transaction.version + 1,
                        },
                    },
                },
            })
        },
        { timeout: 15_000 }
    )
}

function decodeCursor(cursor?: string) {
    if (!cursor || cursor.length > 512) return null
    try {
        const value = JSON.parse(Buffer.from(cursor, "base64url").toString())
        if (
            typeof value.id !== "string" ||
            !value.id ||
            value.id.length > 128 ||
            typeof value.date !== "string"
        )
            return null
        const date = new Date(value.date)
        if (!Number.isFinite(date.getTime())) return null
        return { id: value.id as string, date }
    } catch {
        return null
    }
}

export async function listOwnedAccountTransactions(
    financialAccountId: string,
    cursor?: string
) {
    const { user } = await requireVerifiedSession()
    const before = decodeCursor(cursor)
    const rows = await prisma.ledgerEntry.findMany({
        where: {
            financialAccountId,
            accountWallet: {
                financialAccount: { ownerId: user.id, archivedAt: null },
                wallet: { ownerId: user.id },
            },
            ...(before
                ? {
                      OR: [
                          { transaction: { occurredAt: { lt: before.date } } },
                          {
                              transaction: { occurredAt: before.date },
                              id: { lt: before.id },
                          },
                      ],
                  }
                : {}),
        },
        select: {
            id: true,
            amount: true,
            accountWallet: {
                select: {
                    wallet: {
                        select: {
                            name: true,
                            currency: true,
                            archivedAt: true,
                        },
                    },
                    archivedAt: true,
                },
            },
            category: {
                select: { name: true, parent: { select: { name: true } } },
            },
            transaction: {
                select: {
                    id: true,
                    name: true,
                    type: true,
                    status: true,
                    occurredAt: true,
                    notes: true,
                    version: true,
                },
            },
        },
        orderBy: [{ transaction: { occurredAt: "desc" } }, { id: "desc" }],
        take: 26,
    })
    const entries = rows.slice(0, 25)
    const last = entries.at(-1)
    return {
        nextCursor:
            rows.length > 25 && last
                ? Buffer.from(
                      JSON.stringify({
                          id: last.id,
                          date: last.transaction.occurredAt.toISOString(),
                      })
                  ).toString("base64url")
                : null,
        transactions: entries.map((entry) => ({
            ...entry.transaction,
            date: entry.transaction.occurredAt.toISOString().slice(0, 10),
            occurredAt: undefined,
            amount: entry.amount.toFixed(2),
            currency: entry.accountWallet.wallet.currency,
            walletName: entry.accountWallet.wallet.name,
            canChangeStatus:
                !entry.accountWallet.archivedAt &&
                !entry.accountWallet.wallet.archivedAt,
            category: entry.category
                ? `${entry.category.parent ? `${entry.category.parent.name} / ` : ""}${entry.category.name}`
                : null,
        })),
    }
}
