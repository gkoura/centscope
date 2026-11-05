import "server-only"
import { createHash } from "node:crypto"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireVerifiedSession } from "@/lib/auth/session"
import { generateRule } from "@/lib/recurrence-engine"
import { nextSlot, firstIndexAfter } from "@/lib/recurrence-input"
import type { TransferInput } from "@/lib/transfer-input"
import type { DeleteScope } from "@/lib/transaction-deletion-input"
import { deleteRecurringSelection } from "@/lib/recurring-deletion"
import {
    TransferError,
    movementInclude,
    checkMovements,
    lockAccounts,
    lockAllocations,
    transferLegs,
    transferEndpoints,
    transferSnapshot,
} from "@/lib/transfer-core"

const include = {
    entries: { include: movementInclude },
    occurrence: { include: { rule: true } },
} as const
type Db = Pick<Prisma.TransactionClient, "transaction" | "accountWallet">
async function selection(db: Db, id: string, scope: DeleteScope) {
    const anchor = await db.transaction.findFirst({
        where: { id, type: "TRANSFER" },
        include,
    })
    if (!anchor) return { anchor: null, rows: [] }
    const rows =
        scope === "ONLY"
            ? [anchor]
            : anchor.occurrence
              ? await db.transaction.findMany({
                    where: {
                        type: "TRANSFER",
                        occurrence: {
                            ruleId: anchor.occurrence.ruleId,
                            ...(scope === "FUTURE"
                                ? {
                                      scheduledFor: {
                                          gte: anchor.occurrence.scheduledFor,
                                      },
                                  }
                                : {}),
                        },
                    },
                    include,
                    orderBy: { id: "asc" },
                })
              : []
    return { anchor, rows }
}
export async function withLockedTransfer<T>(
    context: string,
    id: string,
    scope: DeleteScope,
    userId: string,
    proposed: string[],
    work: (
        tx: Prisma.TransactionClient,
        scope: Awaited<ReturnType<typeof selection>>
    ) => Promise<T>
) {
    const initial = await selection(prisma, id, scope)
    if (
        initial.anchor &&
        !initial.anchor.entries.some((e) => e.financialAccountId === context)
    )
        throw new TransferError("This transfer is unavailable in this account.")
    for (const row of initial.rows) {
        checkMovements(row.entries, userId)
        transferLegs(row.entries)
    }
    const templateIds = initial.anchor?.occurrence
        ? [
              initial.anchor.occurrence.rule.sourceId,
              ...(initial.anchor.occurrence.rule.destinationId
                  ? [initial.anchor.occurrence.rule.destinationId]
                  : []),
          ]
        : []
    const allocationIds = [
        ...new Set([
            ...initial.rows.flatMap((r) =>
                r.entries.map((e) => e.accountWalletId)
            ),
            ...proposed,
            ...templateIds,
        ]),
    ].sort()
    const allocations = allocationIds.length
        ? await prisma.accountWallet.findMany({
              where: { id: { in: allocationIds } },
              select: { financialAccountId: true },
          })
        : []
    const accountIds = [
        ...new Set([context, ...allocations.map((a) => a.financialAccountId)]),
    ].sort()
    return prisma.$transaction(
        async (tx) => {
            await lockAccounts(tx, accountIds, userId)
            await lockAllocations(tx, allocationIds)
            const fresh = await selection(tx, id, scope)
            const actualAllocations = await tx.accountWallet.findMany({
                where: { id: { in: allocationIds } },
                select: { financialAccountId: true },
            })
            if (
                actualAllocations.some(
                    (a) => !accountIds.includes(a.financialAccountId)
                )
            )
                throw new TransferError(
                    "A wallet allocation changed. Reload before continuing."
                )
            if (
                fresh.anchor?.occurrence &&
                [
                    fresh.anchor.occurrence.rule.sourceId,
                    ...(fresh.anchor.occurrence.rule.destinationId
                        ? [fresh.anchor.occurrence.rule.destinationId]
                        : []),
                ].some((id) => !allocationIds.includes(id))
            )
                throw new TransferError(
                    "Schedule endpoints changed. Reload before continuing."
                )
            if (
                fresh.rows.some((r) =>
                    r.entries.some(
                        (e) =>
                            !accountIds.includes(e.financialAccountId) ||
                            !allocationIds.includes(e.accountWalletId)
                    )
                )
            )
                throw new TransferError(
                    "Transfer endpoints changed. Reload before continuing."
                )
            for (const row of fresh.rows) {
                checkMovements(row.entries, userId)
                transferLegs(row.entries)
            }
            return work(tx, fresh)
        },
        { timeout: 30_000, maxWait: 10_000 }
    )
}
export async function listOwnedTransferWallets(financialAccountId: string) {
    const { user } = await requireVerifiedSession()
    return prisma.accountWallet.findMany({
        where: {
            archivedAt: null,
            financialAccountId,
            financialAccount: { ownerId: user.id, archivedAt: null },
            wallet: { ownerId: user.id, archivedAt: null },
        },
        select: {
            id: true,
            financialAccountId: true,
            financialAccount: { select: { name: true } },
            wallet: { select: { name: true, currency: true } },
        },
        orderBy: [
            { financialAccountId: "asc" },
            { sortOrder: "asc" },
            { id: "asc" },
        ],
    })
}
export async function createOwnedTransfer(input: TransferInput) {
    const { user } = await requireVerifiedSession()
    const allocations = await prisma.accountWallet.findMany({
        where: { id: { in: [input.sourceId, input.destinationId] } },
        select: { financialAccountId: true },
    })
    return prisma.$transaction(
        async (tx) => {
            await lockAccounts(
                tx,
                [
                    input.contextAccountId,
                    ...allocations.map((a) => a.financialAccountId),
                ],
                user.id
            )
            await lockAllocations(tx, [input.sourceId, input.destinationId])
            const endpoints = await transferEndpoints(
                tx,
                input.sourceId,
                input.destinationId,
                user.id,
                input.amount,
                input.destinationAmount,
                input.contextAccountId
            )
            if (
                [endpoints.source, endpoints.destination].some(
                    (e) =>
                        ![
                            input.contextAccountId,
                            ...allocations.map((a) => a.financialAccountId),
                        ].includes(e.financialAccountId)
                )
            )
                throw new TransferError(
                    "A wallet allocation changed. Reload before continuing."
                )
            const { requestId, ...payload } = input,
                key = `transfer:${requestId}`,
                fingerprint = createHash("sha256")
                    .update(JSON.stringify(payload))
                    .digest("hex")
            const existing = await tx.transaction.findUnique({
                where: {
                    createdById_idempotencyKey: {
                        createdById: user.id,
                        idempotencyKey: key,
                    },
                },
                include: { changes: { where: { action: "CREATED" }, take: 1 } },
            })
            if (existing) {
                const s = existing.changes[0]?.snapshot
                if (
                    !s ||
                    typeof s !== "object" ||
                    Array.isArray(s) ||
                    s.requestFingerprint !== fingerprint
                )
                    throw new TransferError(
                        "This form was already used. Reload to create another transfer."
                    )
                return existing.id
            }
            if (
                await tx.transactionChange.findFirst({
                    where: {
                        actorId: user.id,
                        action: "DELETED",
                        snapshot: { path: ["idempotencyKey"], equals: key },
                    },
                })
            )
                throw new TransferError(
                    "This transfer was deleted. Reload to create a new transfer."
                )
            const row = await tx.transaction.create({
                data: {
                    type: "TRANSFER",
                    name: input.name,
                    notes: input.notes,
                    status: input.status,
                    occurredAt: new Date(`${input.date}T00:00:00Z`),
                    createdById: user.id,
                    idempotencyKey: key,
                    entries: {
                        create: [
                            {
                                accountWalletId: endpoints.source.id,
                                financialAccountId:
                                    endpoints.source.financialAccountId,
                                amount: new Prisma.Decimal(
                                    input.amount
                                ).negated(),
                            },
                            {
                                accountWalletId: endpoints.destination.id,
                                financialAccountId:
                                    endpoints.destination.financialAccountId,
                                amount: endpoints.received,
                            },
                        ],
                    },
                },
                include,
            })
            await tx.transactionChange.create({
                data: {
                    transactionId: row.id,
                    liveTransactionId: row.id,
                    actorId: user.id,
                    action: "CREATED",
                    snapshot: {
                        ...transferSnapshot(row),
                        financialAccountId: input.contextAccountId,
                        requestFingerprint: fingerprint,
                    },
                },
            })
            if (input.repeat) {
                const next = nextSlot(input.date, input.repeat, 1)
                const rule = await tx.recurrenceRule.create({
                    data: {
                        createdById: user.id,
                        type: "TRANSFER",
                        sourceId: input.sourceId,
                        destinationId: input.destinationId,
                        amount: input.amount,
                        destinationAmount: endpoints.received,
                        categoryId: null,
                        name: input.name,
                        notes: input.notes,
                        startsAt: new Date(`${input.date}T00:00:00Z`),
                        frequency: input.repeat.frequency,
                        interval: input.repeat.interval,
                        timezone: input.repeat.timezone,
                        occurrenceStatus: "PENDING",
                        endsAt: input.repeat.endsOn
                            ? new Date(`${input.repeat.endsOn}T00:00:00Z`)
                            : null,
                        endAfter: input.repeat.endAfter,
                        nextOccurrenceAt: next
                            ? new Date(`${next}T00:00:00Z`)
                            : null,
                        occurrences: {
                            create: {
                                transactionId: row.id,
                                scheduledFor: new Date(
                                    `${input.date}T00:00:00Z`
                                ),
                            },
                        },
                    },
                })
                await generateRule(tx, rule.id, user.id)
            }
            return row.id
        },
        { timeout: 30_000 }
    )
}
export async function getOwnedEditableTransfer(context: string, id: string) {
    const { user } = await requireVerifiedSession()
    return prisma.$transaction(
        async (tx) => {
            const { anchor } = await selection(tx, id, "ONLY")
            if (
                !anchor ||
                !anchor.entries.some((e) => e.financialAccountId === context)
            )
                return null
            try {
                checkMovements(anchor.entries, user.id)
            } catch {
                return null
            }
            const { source, destination } = transferLegs(anchor.entries)
            const rule = anchor.occurrence?.rule
            return {
                id: anchor.id,
                version: anchor.version,
                name: anchor.name,
                notes: anchor.notes ?? "",
                date: anchor.occurredAt.toISOString().slice(0, 10),
                status: anchor.status,
                sourceId: source.accountWalletId,
                destinationId: destination.accountWalletId,
                amount: source.amount.abs().toFixed(2),
                destinationAmount: destination.amount.toFixed(2),
                sourceCurrency: source.accountWallet.wallet.currency,
                destinationCurrency: destination.accountWallet.wallet.currency,
                recurrence: rule
                    ? {
                          ruleId: rule.id,
                          ruleVersion: rule.version,
                          scheduledFor: anchor
                              .occurrence!.scheduledFor.toISOString()
                              .slice(0, 10),
                          frequency: rule.frequency,
                          interval: rule.interval,
                          timezone: rule.timezone,
                          occurrenceStatus: "PENDING" as const,
                          endsOn:
                              rule.endsAt?.toISOString().slice(0, 10) ?? null,
                          endAfter: rule.endAfter,
                      }
                    : null,
            }
        },
        { isolationLevel: "RepeatableRead", timeout: 15_000 }
    )
}
export async function updateOwnedTransfer(
    input: TransferInput,
    id: string,
    version: number
) {
    const { user } = await requireVerifiedSession()
    await withLockedTransfer(
        input.contextAccountId,
        id,
        input.editScope,
        user.id,
        [input.sourceId, input.destinationId],
        async (tx, { anchor, rows }) => {
            if (!anchor || anchor.version !== version)
                throw new TransferError(
                    "This transfer changed. Reload before saving."
                )
            const rule = anchor.occurrence?.rule
            if (
                input.editScope !== "ONLY" &&
                (!rule ||
                    rule.createdById !== user.id ||
                    rule.version !== input.expectedRuleVersion ||
                    !input.repeat)
            )
                throw new TransferError(
                    "This series changed. Reload before saving."
                )
            if (
                input.editScope !== "ONLY" &&
                input.date !== anchor.occurredAt.toISOString().slice(0, 10)
            )
                throw new TransferError(
                    "Series edits preserve occurrence dates. Choose Only to change its date."
                )
            const endpoints = await transferEndpoints(
                tx,
                input.sourceId,
                input.destinationId,
                user.id,
                input.amount,
                input.destinationAmount,
                input.contextAccountId
            )
            for (const row of rows) {
                const old = transferLegs(row.entries)
                if (
                    old.source.accountWallet.wallet.currency !==
                        endpoints.source.wallet.currency ||
                    old.destination.accountWallet.wallet.currency !==
                        endpoints.destination.wallet.currency
                )
                    throw new TransferError(
                        "Keep the original currency on each side. Recreate the transfer to change its currency pair."
                    )
            }
            const data = rows.map((row) => ({
                id: row.id,
                before: transferSnapshot(row),
                date:
                    input.editScope === "ONLY"
                        ? input.date
                        : row.occurredAt.toISOString().slice(0, 10),
                version: row.version,
            }))
            // Replace both legs together so reversing endpoints cannot hit the allocation unique key midway.
            await tx.ledgerEntry.deleteMany({
                where: { transactionId: { in: rows.map((r) => r.id) } },
            })
            await tx.transaction.updateMany({
                where: { id: { in: data.map((row) => row.id) } },
                data: {
                    name: input.name,
                    notes: input.notes,
                    status: input.status,
                    ...(input.editScope === "ONLY"
                        ? { occurredAt: new Date(`${input.date}T00:00:00Z`) }
                        : {}),
                    version: { increment: 1 },
                },
            })
            for (let start = 0; start < data.length; start += 500)
                await tx.ledgerEntry.createMany({
                    data: data.slice(start, start + 500).flatMap((row) => [
                        {
                            transactionId: row.id,
                            accountWalletId: input.sourceId,
                            financialAccountId:
                                endpoints.source.financialAccountId,
                            amount: new Prisma.Decimal(input.amount).negated(),
                        },
                        {
                            transactionId: row.id,
                            accountWalletId: input.destinationId,
                            financialAccountId:
                                endpoints.destination.financialAccountId,
                            amount: new Prisma.Decimal(endpoints.received),
                        },
                    ]),
                })
            const changed = await tx.transaction.findMany({
                where: { id: { in: rows.map((r) => r.id) } },
                include: { entries: { include: movementInclude } },
            })
            for (let start = 0; start < data.length; start += 500)
                await tx.transactionChange.createMany({
                    data: data.slice(start, start + 500).map((row) => ({
                        transactionId: row.id,
                        liveTransactionId: row.id,
                        actorId: user.id,
                        action: "UPDATED",
                        snapshot: {
                            financialAccountId: input.contextAccountId,
                            financialAccountIds: transferSnapshot(
                                changed.find((r) => r.id === row.id)!
                            ).financialAccountIds,
                            scope: input.editScope,
                            before: row.before,
                            after: transferSnapshot(
                                changed.find((r) => r.id === row.id)!
                            ),
                        },
                    })),
                })
            if (rule) {
                if (input.editScope === "ONLY")
                    await tx.recurrenceRule.update({
                        where: { id: rule.id },
                        data: { version: { increment: 1 } },
                    })
                else {
                    const latest = await tx.recurrenceOccurrence.findFirst({
                            where: { ruleId: rule.id },
                            orderBy: { scheduledFor: "desc" },
                        }),
                        anchorDate = rule.startsAt.toISOString().slice(0, 10),
                        nextIndex = firstIndexAfter(
                            anchorDate,
                            input.repeat!,
                            latest!.scheduledFor.toISOString().slice(0, 10)
                        ),
                        next = nextSlot(anchorDate, input.repeat!, nextIndex)
                    await tx.recurrenceRule.update({
                        where: { id: rule.id },
                        data: {
                            name: input.name,
                            notes: input.notes,
                            sourceId: input.sourceId,
                            destinationId: input.destinationId,
                            amount: input.amount,
                            destinationAmount: endpoints.received,
                            frequency: input.repeat!.frequency,
                            interval: input.repeat!.interval,
                            timezone: input.repeat!.timezone,
                            endsAt: input.repeat!.endsOn
                                ? new Date(`${input.repeat!.endsOn}T00:00:00Z`)
                                : null,
                            endAfter: input.repeat!.endAfter,
                            nextIndex,
                            nextOccurrenceAt: rule.stoppedAt
                                ? null
                                : next
                                  ? new Date(`${next}T00:00:00Z`)
                                  : null,
                            version: { increment: 1 },
                        },
                    })
                    await generateRule(tx, rule.id, user.id)
                }
            } else if (input.repeat) {
                const next = nextSlot(input.date, input.repeat, 1)
                const created = await tx.recurrenceRule.create({
                    data: {
                        createdById: user.id,
                        type: "TRANSFER",
                        name: input.name,
                        notes: input.notes,
                        sourceId: input.sourceId,
                        destinationId: input.destinationId,
                        amount: input.amount,
                        destinationAmount: endpoints.received,
                        frequency: input.repeat.frequency,
                        interval: input.repeat.interval,
                        timezone: input.repeat.timezone,
                        startsAt: new Date(`${input.date}T00:00:00Z`),
                        endsAt: input.repeat.endsOn
                            ? new Date(`${input.repeat.endsOn}T00:00:00Z`)
                            : null,
                        endAfter: input.repeat.endAfter,
                        nextOccurrenceAt: next
                            ? new Date(`${next}T00:00:00Z`)
                            : null,
                        occurrences: {
                            create: {
                                transactionId: id,
                                scheduledFor: new Date(
                                    `${input.date}T00:00:00Z`
                                ),
                            },
                        },
                    },
                })
                await generateRule(tx, created.id, user.id)
            }
        }
    )
}
export async function changeOwnedTransferStatus(input: {
    financialAccountId: string
    transactionId: string
    expectedVersion: number
    status: "POSTED" | "PENDING"
    amount?: string
    destinationAmount?: string
    confirmed: boolean
}) {
    const { user } = await requireVerifiedSession()
    await withLockedTransfer(
        input.financialAccountId,
        input.transactionId,
        "ONLY",
        user.id,
        [],
        async (tx, { anchor }) => {
            if (!anchor)
                throw new TransferError("This transfer is unavailable.")
            const { source, destination } = transferLegs(anchor.entries),
                fx =
                    source.accountWallet.wallet.currency !==
                    destination.accountWallet.wallet.currency
            if (anchor.version !== input.expectedVersion) {
                if (
                    anchor.version === input.expectedVersion + 1 &&
                    anchor.status === input.status &&
                    (!(fx && input.status === "POSTED") ||
                        (input.confirmed &&
                            input.amount &&
                            input.destinationAmount &&
                            source.amount.abs().equals(input.amount) &&
                            destination.amount.equals(input.destinationAmount)))
                )
                    return
                throw new TransferError(
                    "This transfer changed. Reload before continuing."
                )
            }
            if (anchor.status === input.status) return
            if (
                input.status === "POSTED" &&
                fx &&
                (!input.confirmed || !input.amount || !input.destinationAmount)
            )
                throw new TransferError(
                    "Confirm the actual sent and received amounts before posting."
                )
            const before = transferSnapshot(anchor)
            if (input.status === "POSTED" && fx) {
                await tx.ledgerEntry.update({
                    where: { id: source.id },
                    data: {
                        amount: new Prisma.Decimal(input.amount!).negated(),
                    },
                })
                await tx.ledgerEntry.update({
                    where: { id: destination.id },
                    data: { amount: input.destinationAmount! },
                })
            }
            const row = await tx.transaction.update({
                where: { id: anchor.id, version: input.expectedVersion },
                data: { status: input.status, version: { increment: 1 } },
                include: { entries: { include: movementInclude } },
            })
            if (anchor.occurrence)
                await tx.recurrenceRule.update({
                    where: { id: anchor.occurrence.ruleId },
                    data: { version: { increment: 1 } },
                })
            await tx.transactionChange.create({
                data: {
                    transactionId: row.id,
                    liveTransactionId: row.id,
                    actorId: user.id,
                    action: "STATUS_CHANGED",
                    snapshot: {
                        financialAccountId: input.financialAccountId,
                        before,
                        after: transferSnapshot(row),
                        financialAccountIds:
                            transferSnapshot(row).financialAccountIds,
                    },
                },
            })
        }
    )
}
export async function deleteOwnedTransfer(input: {
    financialAccountId: string
    transactionId: string
    expectedVersion: number
    scope?: DeleteScope
    expectedSnapshot?: string
}) {
    const { user } = await requireVerifiedSession()
    if (!input.expectedSnapshot)
        throw new TransferError(
            "Load the transfer deletion preview before confirming."
        )
    await withLockedTransfer(
        input.financialAccountId,
        input.transactionId,
        input.scope ?? "ONLY",
        user.id,
        [],
        async (tx) => {
            await deleteRecurringSelection(
                tx,
                {
                    financialAccountId: input.financialAccountId,
                    transactionId: input.transactionId,
                    expectedVersion: input.expectedVersion,
                    scope: input.scope ?? "ONLY",
                    expectedSnapshot: input.expectedSnapshot!,
                },
                user.id
            )
        }
    )
}
export async function isTransferReference(accountId: string, id: string) {
    const { user } = await requireVerifiedSession()
    return Boolean(
        await prisma.transaction.findFirst({
            where: {
                id,
                type: "TRANSFER",
                entries: {
                    some: {
                        financialAccountId: accountId,
                        accountWallet: {
                            financialAccount: { ownerId: user.id },
                        },
                    },
                },
            },
            select: { id: true },
        })
    )
}
