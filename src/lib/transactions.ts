import "server-only"

import { createHash, randomUUID } from "node:crypto"
import { Prisma } from "@/generated/prisma/client"
import { requireVerifiedSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { nextDay } from "@/lib/account-period"
import {
    walletFilterIds,
    type TransactionFilters,
} from "@/lib/transaction-filters"
import type { TransactionInput } from "@/lib/transaction-input"
import { validSpread } from "@/lib/expense-spread"

import { createRuleForTransaction, updateSeries } from "@/lib/recurrence-engine"
import { validRepeat } from "@/lib/recurrence-input"

import { deleteRecurringSelection } from "@/lib/recurring-deletion"
import { movementInclude } from "@/lib/transfer-core"
import { isTransferReference, deleteOwnedTransfer } from "@/lib/transfers"
import type { DeleteScope } from "@/lib/transaction-deletion-input"

export class TransactionWriteError extends Error {}

function validateExpenseSpread(input: TransactionInput) {
    if (
        input.spread &&
        (input.type !== "EXPENSE" || !validSpread(input.spread))
    )
        throw new TransactionWriteError(
            "Only expenses can be spread over 2–120 valid months."
        )
}

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
    validateExpenseSpread(input)
    if (input.repeat && !validRepeat(input.repeat, input.date))
        throw new TransactionWriteError("Choose a valid repeat schedule.")
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
            expenseSpread: input.spread ? { create: input.spread } : undefined,
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
    await createRuleForTransaction(tx, input, transaction.id, userId)
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
            const recurring = await tx.recurrenceOccurrence.findUnique({
                where: { transactionId: transaction.id },
                select: { ruleId: true },
            })
            if (recurring)
                await tx.recurrenceRule.update({
                    where: { id: recurring.ruleId },
                    data: { version: { increment: 1 } },
                })
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
            value.v !== 2 ||
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
    filters: TransactionFilters = {},
    options: { unpaginated?: boolean; pageSize?: number; after?: string } = {}
) {
    const { user } = await requireVerifiedSession(),
        before = options.unpaginated ? null : decodeCursor(cursor)
    const after = options.unpaginated ? null : decodeCursor(options.after)
    const anchor = after ?? before
    const pageSize = options.pageSize === 50 ? 50 : 25
    const selectedWallets = walletFilterIds(filters.wallet)
    const qualifying: Prisma.LedgerEntryWhereInput = {
        financialAccountId,
        accountWallet: {
            financialAccount: { ownerId: user.id, archivedAt: null },
            wallet: { ownerId: user.id },
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
    }
    const rows = await prisma.$transaction(
        (tx) =>
            tx.transaction.findMany({
                where: {
                    entries: { some: qualifying },
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
                    ...(filters.from || filters.to
                        ? {
                              occurredAt: {
                                  ...(filters.from
                                      ? {
                                            gte: new Date(
                                                `${filters.from}T00:00:00Z`
                                            ),
                                        }
                                      : {}),
                                  ...(filters.to
                                      ? {
                                            lt: nextDay(filters.to),
                                        }
                                      : {}),
                              },
                          }
                        : {}),
                    ...(anchor
                        ? {
                              AND: [
                                  {
                                      OR: [
                                          {
                                              occurredAt: {
                                                  [after ? "gt" : "lt"]:
                                                      anchor.date,
                                              },
                                          },
                                          {
                                              occurredAt: anchor.date,
                                              id: {
                                                  [after ? "gt" : "lt"]:
                                                      anchor.id,
                                              },
                                          },
                                      ],
                                  },
                              ],
                          }
                        : {}),
                },
                include: {
                    entries: { include: movementInclude },
                    expenseSpread: true,
                    occurrence: { select: { ruleId: true } },
                },
                orderBy: [
                    { occurredAt: after ? "asc" : "desc" },
                    { id: after ? "asc" : "desc" },
                ],
                ...(options.unpaginated ? {} : { take: pageSize + 1 }),
            }),
        { isolationLevel: "RepeatableRead", maxWait: 10_000, timeout: 15_000 }
    )
    const page = options.unpaginated ? rows : rows.slice(0, pageSize)
    if (after) page.reverse()
    const last = page.at(-1),
        first = page[0]
    const encode = (row: typeof first) =>
        row
            ? Buffer.from(
                  JSON.stringify({
                      v: 2,
                      id: row.id,
                      date: row.occurredAt.toISOString(),
                  })
              ).toString("base64url")
            : null
    return {
        previousCursor:
            !options.unpaginated &&
            first &&
            (before || (after && rows.length > pageSize))
                ? encode(first)
                : null,
        nextCursor:
            !options.unpaginated && (after || rows.length > pageSize) && last
                ? Buffer.from(
                      JSON.stringify({
                          v: 2,
                          id: last.id,
                          date: last.occurredAt.toISOString(),
                      })
                  ).toString("base64url")
                : null,
        transactions: page.map((row) => {
            const entry = row.entries.find(
                (e) =>
                    e.financialAccountId === financialAccountId &&
                    (!selectedWallets.length ||
                        selectedWallets.includes(e.accountWalletId))
            )!
            const owned = (e: typeof entry) =>
                e.accountWallet.wallet.ownerId === user.id &&
                e.accountWallet.financialAccount.ownerId === user.id
            const endpoint = (e: typeof entry) => ({
                available: owned(e),
                id: owned(e) ? e.accountWalletId : "",
                walletName: owned(e)
                    ? e.accountWallet.wallet.name
                    : "Other account",
                accountName: owned(e)
                    ? e.accountWallet.financialAccount.name
                    : "",
                amount: owned(e) ? e.amount.abs().toFixed(2) : "",
                currency: owned(e) ? e.accountWallet.wallet.currency : "",
            })
            const transfer =
                row.type === "TRANSFER"
                    ? {
                          source: endpoint(
                              row.entries.find((e) => e.amount.isNegative())!
                          ),
                          destination: endpoint(
                              row.entries.find((e) => e.amount.isPositive())!
                          ),
                          direction:
                              row.entries.every(
                                  (e) =>
                                      e.financialAccountId ===
                                      financialAccountId
                              ) &&
                              row.entries.every(
                                  (e) =>
                                      !selectedWallets.length ||
                                      selectedWallets.includes(
                                          e.accountWalletId
                                      )
                              )
                                  ? "INTERNAL"
                                  : entry.amount.isNegative()
                                    ? "OUT"
                                    : "IN",
                      }
                    : null
            return {
                id: row.id,
                name: row.name,
                type: row.type,
                status: row.status,
                notes: row.notes,
                version: row.version,
                expenseSpread: row.expenseSpread,
                occurrence: row.occurrence,
                date: row.occurredAt.toISOString().slice(0, 10),
                amount: entry.amount.toFixed(2),
                currency: entry.accountWallet.wallet.currency,
                walletName: entry.accountWallet.wallet.name,
                canChangeStatus: row.entries.every(
                    (e) =>
                        owned(e) &&
                        !e.accountWallet.archivedAt &&
                        !e.accountWallet.wallet.archivedAt &&
                        !e.accountWallet.financialAccount.archivedAt
                ),
                category:
                    row.type === "TRANSFER"
                        ? null
                        : entry.category
                          ? `${entry.category.parent ? `${entry.category.parent.name} / ` : ""}${entry.category.name}`
                          : null,
                transfer,
            }
        }),
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
        include: {
            entries: true,
            expenseSpread: true,
            occurrence: {
                include: {
                    rule: {
                        include: {
                            _count: {
                                select: {
                                    occurrences: {
                                        where: { transactionId: { not: null } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    })
    if (!row || row.entries.length !== 1) return null
    const futureCount = row.occurrence
        ? await prisma.recurrenceOccurrence.count({
              where: {
                  ruleId: row.occurrence.ruleId,
                  transactionId: { not: null },
                  scheduledFor: { gte: row.occurrence.scheduledFor },
              },
          })
        : 0
    return {
        recurrence: row.occurrence
            ? {
                  totalCount: row.occurrence.rule._count.occurrences,
                  futureCount,
                  ruleId: row.occurrence.ruleId,
                  ruleVersion: row.occurrence.rule.version,
                  scheduledFor: row.occurrence.scheduledFor
                      .toISOString()
                      .slice(0, 10),
                  frequency: row.occurrence.rule.frequency,
                  interval: row.occurrence.rule.interval,
                  timezone: row.occurrence.rule.timezone,
                  endsOn:
                      row.occurrence.rule.endsAt?.toISOString().slice(0, 10) ??
                      null,
                  endAfter: row.occurrence.rule.endAfter,
                  occurrenceStatus: "PENDING" as const,
              }
            : null,
        spread: row.expenseSpread
            ? {
                  startMonth: row.expenseSpread.startMonth,
                  monthCount: row.expenseSpread.monthCount,
              }
            : null,
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
    validateExpenseSpread(input)
    await prisma.$transaction(
        async (tx) => {
            await lockAccount(tx, input.financialAccountId, user.id)
            if (input.editScope && input.editScope !== "ONLY") {
                if (input.repeat && !validRepeat(input.repeat, input.date))
                    throw new TransactionWriteError(
                        "Choose a valid repeat schedule."
                    )
                await updateSeries(
                    tx,
                    input,
                    transactionId,
                    expectedVersion,
                    user.id
                )
                return
            }
            const previous = await tx.transaction.findFirst({
                where: {
                    id: transactionId,
                    type: { in: ["EXPENSE", "INCOME"] },
                    entries: {
                        some: { financialAccountId: input.financialAccountId },
                    },
                },
                include: {
                    expenseSpread: true,
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
            if (input.type === "EXPENSE" && input.spread) {
                await tx.expenseSpread.upsert({
                    where: { transactionId },
                    create: { transactionId, ...input.spread },
                    update: input.spread,
                })
            } else {
                await tx.expenseSpread.deleteMany({ where: { transactionId } })
            }
            await tx.ledgerEntry.update({
                where: { id: entry.id },
                data: {
                    accountWalletId: input.accountWalletId,
                    categoryId: input.categoryId,
                    amount,
                },
            })
            const occurrence = await tx.recurrenceOccurrence.findUnique({
                where: { transactionId },
            })
            if (occurrence)
                await tx.recurrenceRule.update({
                    where: { id: occurrence.ruleId },
                    data: { version: { increment: 1 } },
                })
            if (!occurrence && input.repeat) {
                if (!validRepeat(input.repeat, input.date))
                    throw new TransactionWriteError(
                        "Choose a valid repeat schedule."
                    )
                await createRuleForTransaction(
                    tx,
                    input,
                    transactionId,
                    user.id
                )
            }
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
                spread: { startMonth: string; monthCount: number } | null
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
                        recurrenceRuleId: occurrence?.ruleId ?? null,
                        repeatCreated: !occurrence
                            ? (input.repeat ?? null)
                            : null,
                        before: snapshot({
                            spread: previous.expenseSpread
                                ? {
                                      startMonth:
                                          previous.expenseSpread.startMonth,
                                      monthCount:
                                          previous.expenseSpread.monthCount,
                                  }
                                : null,
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
                            spread:
                                input.type === "EXPENSE"
                                    ? (input.spread ?? null)
                                    : null,
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
    scope?: DeleteScope
    expectedSnapshot?: string
}) {
    const { user } = await requireVerifiedSession()
    if (
        await isTransferReference(input.financialAccountId, input.transactionId)
    )
        return deleteOwnedTransfer(input)
    const transferReceipt = await prisma.transactionChange.findFirst({
        where: {
            actorId: user.id,
            action: "DELETED",
            transactionId: input.transactionId,
            snapshot: { path: ["type"], equals: "TRANSFER" },
        },
        select: { id: true },
    })
    if (transferReceipt) return deleteOwnedTransfer(input)
    await prisma.$transaction(
        async (tx) => {
            await lockAccount(tx, input.financialAccountId, user.id)
            if (
                input.expectedSnapshot ||
                (input.scope && input.scope !== "ONLY")
            ) {
                if (!input.expectedSnapshot)
                    throw new TransactionWriteError(
                        "Preview the recurring deletion before confirming."
                    )
                await deleteRecurringSelection(
                    tx,
                    {
                        financialAccountId: input.financialAccountId,
                        transactionId: input.transactionId,
                        expectedVersion: input.expectedVersion,
                        scope: input.scope ?? "ONLY",
                        expectedSnapshot: input.expectedSnapshot,
                    },
                    user.id
                )
                return
            }
            const transaction = await tx.transaction.findFirst({
                where: {
                    id: input.transactionId,
                    type: { in: ["EXPENSE", "INCOME"] },
                    entries: {
                        some: { financialAccountId: input.financialAccountId },
                    },
                },
                include: {
                    expenseSpread: true,
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
                        spread: transaction.expenseSpread
                            ? {
                                  startMonth:
                                      transaction.expenseSpread.startMonth,
                                  monthCount:
                                      transaction.expenseSpread.monthCount,
                              }
                            : null,
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
            await tx.recurrenceRule.updateMany({
                where: {
                    occurrences: { some: { transactionId: transaction.id } },
                },
                data: { version: { increment: 1 } },
            })
            await tx.recurrenceOccurrence.updateMany({
                where: { transactionId: transaction.id },
                data: { skippedAt: new Date() },
            })
            // Ledger entries cascade; live audit references become null and survive.
            await tx.transaction.delete({
                where: { id: transaction.id, version: input.expectedVersion },
            })
        },
        { timeout: 30_000 }
    )
}
