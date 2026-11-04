import "server-only"

import { createHash, randomUUID } from "node:crypto"
import { Prisma } from "@/generated/prisma/client"
import { requireVerifiedSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import type { TransactionFilters } from "@/lib/transaction-filters"
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

async function insertTransaction(
    tx: Prisma.TransactionClient,
    input: TransactionInput,
    userId: string
) {
    const { requestId, ...payload } = input
    const fingerprint = createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex")
    const idempotencyKey = `manual:${requestId}`
    const allocations = await tx.$queryRaw<{ id: string; currency: string }[]>`
            SELECT aw.id, w.currency FROM account_wallet aw JOIN wallet w ON w.id = aw."walletId"
            WHERE aw.id = ${input.accountWalletId} AND aw."financialAccountId" = ${input.financialAccountId}
              AND aw."archivedAt" IS NULL AND w."archivedAt" IS NULL AND w."ownerId" = ${userId}
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
                createdById: userId,
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
    const deleted = await tx.transactionChange.findFirst({
        where: {
            actorId: userId,
            action: "DELETED",
            snapshot: { path: ["idempotencyKey"], equals: idempotencyKey },
        },
        select: { id: true },
    })
    if (deleted)
        throw new TransactionWriteError(
            "This transaction was deleted. Reload to create a new transaction."
        )
    const amount = new Prisma.Decimal(input.amount)
    const signedAmount = input.type === "EXPENSE" ? amount.negated() : amount
    const transaction = await tx.transaction.create({
        data: {
            type: input.type,
            name: input.name,
            notes: input.notes,
            status: input.status,
            occurredAt: new Date(`${input.date}T00:00:00.000Z`),
            createdById: userId,
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
            actorId: userId,
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
}

export async function createOwnedTransaction(input: TransactionInput) {
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(
        async (tx) => {
            await lockAccount(tx, input.financialAccountId, user.id)
            await insertTransaction(tx, input, user.id)
        },
        { timeout: 15_000 }
    )
}

export async function importOwnedTransactions(
    inputs: TransactionInput[],
    start = 0
) {
    const { user } = await requireVerifiedSession()
    if (
        !inputs.length ||
        inputs.length > 50 ||
        inputs.some(
            (input) => input.financialAccountId !== inputs[0].financialAccountId
        )
    )
        throw new TransactionWriteError(
            "Import between 1 and 50 transactions per batch into one account."
        )
    return prisma.$transaction(
        async (tx) => {
            await lockAccount(tx, inputs[0].financialAccountId, user.id)
            const prepared = inputs.map((input, index) => {
                const { requestId, ...payload } = input
                return {
                    input,
                    payload,
                    index,
                    id: randomUUID(),
                    key: `manual:${requestId}`,
                    fingerprint: createHash("sha256")
                        .update(JSON.stringify(payload))
                        .digest("hex"),
                }
            })
            if (
                new Set(prepared.map((row) => row.key)).size !== prepared.length
            )
                throw new TransactionWriteError(
                    "Duplicate row identifiers in this batch."
                )
            const existing = await tx.transaction.findMany({
                where: {
                    createdById: user.id,
                    idempotencyKey: { in: prepared.map((row) => row.key) },
                },
                select: {
                    idempotencyKey: true,
                    changes: {
                        where: { action: "CREATED" },
                        take: 1,
                        select: { snapshot: true },
                    },
                },
            })
            const deleted = await tx.transactionChange.findMany({
                where: {
                    actorId: user.id,
                    action: "DELETED",
                    AND: [
                        {
                            snapshot: {
                                path: ["financialAccountId"],
                                equals: inputs[0].financialAccountId,
                            },
                        },
                        {
                            OR: prepared.map((row) => ({
                                snapshot: {
                                    path: ["idempotencyKey"],
                                    equals: row.key,
                                },
                            })),
                        },
                    ],
                },
                select: { snapshot: true },
            })
            const saved = new Map(
                existing.map((row) => [
                    row.idempotencyKey,
                    row.changes[0]?.snapshot,
                ])
            )
            for (const { snapshot } of deleted) {
                if (
                    snapshot &&
                    typeof snapshot === "object" &&
                    !Array.isArray(snapshot) &&
                    typeof snapshot.idempotencyKey === "string"
                )
                    saved.set(snapshot.idempotencyKey, snapshot)
            }
            const pending = prepared.filter((row) => {
                if (!saved.has(row.key)) return true
                const snapshot = saved.get(row.key)
                if (
                    !snapshot ||
                    typeof snapshot !== "object" ||
                    Array.isArray(snapshot) ||
                    snapshot.requestFingerprint !== row.fingerprint
                )
                    throw new TransactionWriteError(
                        `Row ${start + row.index + 2} conflicts with a previously imported row. Earlier batches remain saved.`
                    )
                return false
            })
            if (!pending.length)
                return { imported: 0, skipped: prepared.length }
            const walletIds = [
                ...new Set(pending.map((row) => row.input.accountWalletId)),
            ].sort()
            const allocations = await tx.$queryRaw<
                { id: string; currency: string }[]
            >`
            SELECT aw.id, w.currency FROM account_wallet aw JOIN wallet w ON w.id = aw."walletId"
            WHERE aw.id IN (${Prisma.join(walletIds)}) AND aw."financialAccountId" = ${inputs[0].financialAccountId}
                AND aw."archivedAt" IS NULL AND w."archivedAt" IS NULL AND w."ownerId" = ${user.id}
            ORDER BY aw.id FOR UPDATE OF aw, w
        `
            const wallets = new Map(
                allocations.map((row) => [row.id, row.currency])
            )
            const categories = await tx.category.findMany({
                where: {
                    id: {
                        in: [
                            ...new Set(
                                pending.map((row) => row.input.categoryId)
                            ),
                        ],
                    },
                    financialAccountId: inputs[0].financialAccountId,
                    archivedAt: null,
                    OR: [{ parentId: null }, { parent: { archivedAt: null } }],
                },
                select: { id: true, type: true },
            })
            const categoryTypes = new Map(
                categories.map((row) => [row.id, row.type])
            )
            for (const row of pending) {
                if (
                    !wallets.has(row.input.accountWalletId) ||
                    categoryTypes.get(row.input.categoryId) !== row.input.type
                )
                    throw new TransactionWriteError(
                        `Row ${start + row.index + 2}: its wallet or category is no longer available. Earlier batches remain saved.`
                    )
            }
            await tx.transaction.createMany({
                data: pending.map(({ id, key, input }) => ({
                    id,
                    idempotencyKey: key,
                    createdById: user.id,
                    name: input.name,
                    notes: input.notes,
                    type: input.type,
                    status: input.status,
                    occurredAt: new Date(`${input.date}T00:00:00.000Z`),
                })),
            })
            const amount = (input: TransactionInput) =>
                new Prisma.Decimal(input.amount).mul(
                    input.type === "EXPENSE" ? -1 : 1
                )
            await tx.ledgerEntry.createMany({
                data: pending.map(({ id, input }) => ({
                    id: randomUUID(),
                    transactionId: id,
                    financialAccountId: input.financialAccountId,
                    accountWalletId: input.accountWalletId,
                    categoryId: input.categoryId,
                    amount: amount(input),
                })),
            })
            await tx.transactionChange.createMany({
                data: pending.map(({ id, payload, input, fingerprint }) => ({
                    id: randomUUID(),
                    transactionId: id,
                    liveTransactionId: id,
                    actorId: user.id,
                    action: "CREATED",
                    snapshot: {
                        ...payload,
                        amount: amount(input).toFixed(2),
                        currency: wallets.get(input.accountWalletId)!,
                        version: 1,
                        requestFingerprint: fingerprint,
                    },
                })),
            })
            return {
                imported: pending.length,
                skipped: prepared.length - pending.length,
            }
        },
        { timeout: 15_000, maxWait: 10_000 }
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
    cursor?: string,
    filters: TransactionFilters = {}
) {
    const { user } = await requireVerifiedSession()
    const before = decodeCursor(cursor)
    const rows = await prisma.ledgerEntry.findMany({
        where: {
            financialAccountId,
            ...(filters.wallet ? { accountWalletId: filters.wallet } : {}),
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
                ...(filters.type ? { type: filters.type } : {}),
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.from || filters.to
                    ? {
                          occurredAt: {
                              ...(filters.from
                                  ? {
                                        gte: new Date(
                                            `${filters.from}T00:00:00.000Z`
                                        ),
                                    }
                                  : {}),
                              ...(filters.to
                                  ? {
                                        lte: new Date(
                                            `${filters.to}T00:00:00.000Z`
                                        ),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
            },
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

// Keep history private to the current account and send only reusable details.
export async function listOwnedTransactionSuggestions(
    financialAccountId: string
) {
    const { user } = await requireVerifiedSession()
    const entries = await prisma.ledgerEntry.findMany({
        where: {
            financialAccountId,
            accountWallet: {
                financialAccount: { ownerId: user.id, archivedAt: null },
                wallet: { ownerId: user.id },
            },
            transaction: { type: { in: ["EXPENSE", "INCOME"] } },
            category: {
                financialAccountId,
                archivedAt: null,
                OR: [{ parentId: null }, { parent: { archivedAt: null } }],
            },
        },
        select: {
            id: true,
            transaction: { select: { name: true, type: true } },
            category: {
                select: {
                    id: true,
                    name: true,
                    type: true,
                    parentId: true,
                    parent: { select: { name: true } },
                },
            },
        },
        orderBy: [{ transaction: { createdAt: "desc" } }, { id: "desc" }],
        take: 500,
    })
    const seen = new Set<string>()
    const suggestions: import("@/lib/transaction-input").TransactionSuggestion[] =
        []
    for (const entry of entries) {
        const { category, transaction } = entry
        if (
            !category ||
            (transaction.type !== "EXPENSE" && transaction.type !== "INCOME") ||
            category.type !== transaction.type
        )
            continue
        const key = JSON.stringify([
            transaction.type,
            transaction.name.trim().toLocaleLowerCase(),
            category.id,
        ])
        if (seen.has(key)) continue
        seen.add(key)
        suggestions.push({
            id: entry.id,
            name: transaction.name,
            type: transaction.type,
            categoryId: category.parentId ?? category.id,
            subcategoryId: category.parentId ? category.id : null,
            categoryLabel: category.parent
                ? `${category.parent.name} / ${category.name}`
                : category.name,
        })
    }
    return suggestions
}

export async function getOwnedEditableTransaction(
    financialAccountId: string,
    transactionId: string
) {
    const { user } = await requireVerifiedSession()
    const row = await prisma.transaction.findFirst({
        where: {
            id: transactionId,
            type: { in: ["EXPENSE", "INCOME"] },
            entries: {
                some: {
                    financialAccountId,
                    accountWallet: {
                        financialAccount: {
                            ownerId: user.id,
                            archivedAt: null,
                        },
                        archivedAt: null,
                        wallet: { ownerId: user.id, archivedAt: null },
                    },
                },
            },
        },
        include: { entries: true },
    })
    if (!row || row.entries.length !== 1) return null
    return {
        id: row.id,
        version: row.version,
        name: row.name,
        type: row.type as "EXPENSE" | "INCOME",
        status: row.status,
        date: row.occurredAt.toISOString().slice(0, 10),
        notes: row.notes ?? "",
        amount: row.entries[0].amount.abs().toFixed(2),
        accountWalletId: row.entries[0].accountWalletId,
        categoryId: row.entries[0].categoryId ?? "",
    }
}

export async function updateOwnedTransaction(
    input: TransactionInput,
    transactionId: string,
    expectedVersion: number
) {
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(
        async (tx) => {
            await lockAccount(tx, input.financialAccountId, user.id)
            const previous = await tx.transaction.findFirst({
                where: {
                    id: transactionId,
                    type: { in: ["EXPENSE", "INCOME"] },
                    entries: {
                        some: { financialAccountId: input.financialAccountId },
                    },
                },
                include: {
                    entries: {
                        include: {
                            accountWallet: { include: { wallet: true } },
                        },
                    },
                },
            })
            const entry = previous?.entries[0]
            if (
                !previous ||
                previous.entries.length !== 1 ||
                !entry ||
                entry.accountWallet.archivedAt ||
                entry.accountWallet.wallet.archivedAt ||
                entry.accountWallet.wallet.ownerId !== user.id
            )
                throw new TransactionWriteError(
                    "This transaction is unavailable."
                )
            if (previous.version !== expectedVersion)
                throw new TransactionWriteError(
                    "This transaction changed. Reload it before saving your edits."
                )
            // Serialize wallet ownership/currency checks with competing wallet changes.
            await tx.$queryRaw`
                SELECT aw.id FROM account_wallet aw JOIN wallet w ON w.id = aw."walletId"
                WHERE aw.id IN (${entry.accountWalletId}, ${input.accountWalletId})
                ORDER BY aw.id FOR UPDATE OF aw, w
            `
            const [wallet, category] = await Promise.all([
                tx.accountWallet.findFirst({
                    where: {
                        id: input.accountWalletId,
                        financialAccountId: input.financialAccountId,
                        archivedAt: null,
                        wallet: { ownerId: user.id, archivedAt: null },
                    },
                    include: { wallet: true },
                }),
                tx.category.findFirst({
                    where: {
                        id: input.categoryId,
                        financialAccountId: input.financialAccountId,
                        type: input.type,
                        archivedAt: null,
                        OR: [
                            { parentId: null },
                            { parent: { archivedAt: null } },
                        ],
                    },
                }),
            ])
            if (!wallet || !category)
                throw new TransactionWriteError(
                    "Choose an available wallet and an active category of the matching type."
                )
            if (wallet.wallet.currency !== entry.accountWallet.wallet.currency)
                throw new TransactionWriteError(
                    "Choose a wallet in the original currency. Cross-currency corrections are not supported."
                )
            const amount = new Prisma.Decimal(input.amount).mul(
                input.type === "EXPENSE" ? -1 : 1
            )
            await tx.transaction.update({
                where: { id: transactionId, version: expectedVersion },
                data: {
                    name: input.name,
                    notes: input.notes,
                    type: input.type,
                    status: input.status,
                    occurredAt: new Date(`${input.date}T00:00:00.000Z`),
                    version: { increment: 1 },
                },
            })
            await tx.ledgerEntry.update({
                where: { id: entry.id },
                data: {
                    accountWalletId: input.accountWalletId,
                    categoryId: input.categoryId,
                    amount,
                },
            })
            const snapshot = (value: {
                name: string
                notes: string | null
                type: string
                status: string
                date: string
                amount: string
                accountWalletId: string
                categoryId: string | null
                version: number
            }) => ({
                ...value,
                financialAccountId: input.financialAccountId,
                currency: wallet.wallet.currency,
            })
            await tx.transactionChange.create({
                data: {
                    transactionId,
                    liveTransactionId: transactionId,
                    actorId: user.id,
                    action: "UPDATED",
                    snapshot: {
                        before: snapshot({
                            name: previous.name,
                            notes: previous.notes,
                            type: previous.type,
                            status: previous.status,
                            date: previous.occurredAt
                                .toISOString()
                                .slice(0, 10),
                            amount: entry.amount.toFixed(2),
                            accountWalletId: entry.accountWalletId,
                            categoryId: entry.categoryId,
                            version: previous.version,
                        }),
                        after: snapshot({
                            name: input.name,
                            notes: input.notes,
                            type: input.type,
                            status: input.status,
                            date: input.date,
                            amount: amount.toFixed(2),
                            accountWalletId: input.accountWalletId,
                            categoryId: input.categoryId,
                            version: expectedVersion + 1,
                        }),
                    },
                },
            })
        },
        { timeout: 15_000 }
    )
}

export async function deleteOwnedTransaction(input: {
    financialAccountId: string
    transactionId: string
    expectedVersion: number
}) {
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(
        async (tx) => {
            await lockAccount(tx, input.financialAccountId, user.id)
            const transaction = await tx.transaction.findFirst({
                where: {
                    id: input.transactionId,
                    type: { in: ["EXPENSE", "INCOME"] },
                    entries: {
                        some: { financialAccountId: input.financialAccountId },
                    },
                },
                include: {
                    entries: {
                        include: {
                            accountWallet: { include: { wallet: true } },
                            category: { include: { parent: true } },
                        },
                    },
                    changes: {
                        where: { action: "CREATED" },
                        take: 1,
                        select: { snapshot: true },
                    },
                },
            })
            if (!transaction) {
                const deleted = await tx.transactionChange.findFirst({
                    where: {
                        transactionId: input.transactionId,
                        actorId: user.id,
                        action: "DELETED",
                        AND: [
                            {
                                snapshot: {
                                    path: ["financialAccountId"],
                                    equals: input.financialAccountId,
                                },
                            },
                            {
                                snapshot: {
                                    path: ["version"],
                                    equals: input.expectedVersion,
                                },
                            },
                        ],
                    },
                    select: { id: true },
                })
                if (deleted) return
                throw new TransactionWriteError(
                    "This transaction is unavailable."
                )
            }
            const entry = transaction.entries[0]
            if (
                transaction.entries.length !== 1 ||
                !entry ||
                entry.accountWallet.wallet.ownerId !== user.id ||
                entry.accountWallet.archivedAt ||
                entry.accountWallet.wallet.archivedAt
            )
                throw new TransactionWriteError(
                    "This transaction is unavailable."
                )
            if (transaction.version !== input.expectedVersion)
                throw new TransactionWriteError(
                    "This transaction changed. Reload before deleting it."
                )
            const original = transaction.changes[0]?.snapshot
            const fingerprint =
                original &&
                typeof original === "object" &&
                !Array.isArray(original) &&
                typeof original.requestFingerprint === "string"
                    ? original.requestFingerprint
                    : null
            await tx.transactionChange.create({
                data: {
                    transactionId: transaction.id,
                    liveTransactionId: transaction.id,
                    actorId: user.id,
                    action: "DELETED",
                    snapshot: {
                        financialAccountId: input.financialAccountId,
                        createdById: transaction.createdById,
                        idempotencyKey: transaction.idempotencyKey,
                        requestFingerprint: fingerprint,
                        name: transaction.name,
                        notes: transaction.notes,
                        type: transaction.type,
                        status: transaction.status,
                        date: transaction.occurredAt.toISOString().slice(0, 10),
                        version: transaction.version,
                        amount: entry.amount.toFixed(2),
                        currency: entry.accountWallet.wallet.currency,
                        accountWalletId: entry.accountWalletId,
                        walletName: entry.accountWallet.wallet.name,
                        categoryId: entry.categoryId,
                        categoryName: entry.category?.name ?? null,
                        parentCategoryName:
                            entry.category?.parent?.name ?? null,
                    },
                },
            })
            // Ledger entries cascade; live audit references become null and survive.
            await tx.transaction.delete({
                where: { id: transaction.id, version: input.expectedVersion },
            })
        },
        { timeout: 15_000 }
    )
}
