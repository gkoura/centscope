import "server-only"
import { createHash } from "node:crypto"
import { moneyCents, centsMoney } from "@/lib/expense-spread"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireVerifiedSession } from "@/lib/auth/session"
import { lockFinancialAccess, sharedAuditContext } from "@/lib/financial-access"
import {
    checkMovements,
    lockAllocations,
    movementInclude,
    transferLegs,
    transferSnapshot,
} from "@/lib/transfer-core"
import {
    MAX_BULK_AFFECTED,
    type BulkInput,
    type BulkPreview,
} from "@/lib/bulk-transaction-input"
export class BulkError extends Error {}
const hash = (value: unknown) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex")
const include = {
    entries: { include: movementInclude, orderBy: { id: "asc" as const } },
    expenseSpread: true,
    occurrence: {
        include: {
            rule: {
                include: {
                    source: { include: { wallet: true } },
                    destination: { include: { wallet: true } },
                },
            },
        },
    },
    changes: {
        where: { action: "CREATED" },
        take: 1,
        select: { snapshot: true },
    },
} as const

async function selection(
    tx: Prisma.TransactionClient,
    input: BulkInput,
    ownerId: string
) {
    const chosen = await tx.transaction.findMany({
        where: {
            id: { in: input.selected.map((r) => r.id) },
            entries: { some: { financialAccountId: input.accountId } },
        },
        include,
    })
    if (
        chosen.length !== input.selected.length ||
        chosen.some(
            (row) =>
                row.version !==
                input.selected.find((r) => r.id === row.id)!.version
        )
    )
        throw new BulkError(
            "A selected transaction changed or is unavailable. Refresh and select it again."
        )
    const anchors = new Map<string, Date>()
    for (const row of chosen)
        if (row.occurrence) {
            const slot = row.occurrence.scheduledFor,
                previous = anchors.get(row.occurrence.ruleId)
            if (!previous || slot < previous)
                anchors.set(row.occurrence.ruleId, slot)
        }
    const rows =
        input.scope === "ONLY" || !anchors.size
            ? chosen.sort((a, b) => a.id.localeCompare(b.id))
            : await tx.transaction.findMany({
                  where: {
                      OR: [
                          { id: { in: chosen.map((r) => r.id) } },
                          ...[...anchors].map(([ruleId, slot]) => ({
                              occurrence: {
                                  ruleId,
                                  ...(input.scope === "FUTURE"
                                      ? { scheduledFor: { gte: slot } }
                                      : {}),
                              },
                          })),
                      ],
                  },
                  include,
                  orderBy: { id: "asc" },
                  take: MAX_BULK_AFFECTED + 1,
              })
    if (rows.length > MAX_BULK_AFFECTED)
        throw new BulkError(
            `This scope affects more than ${MAX_BULK_AFFECTED.toLocaleString("en")} transactions. Choose a smaller selection or scope.`
        )
    for (const row of rows) {
        if (
            !["EXPENSE", "INCOME", "TRANSFER"].includes(row.type) ||
            row.version >= 2147483647 ||
            row.entries.some((e) => e.financialAccountId !== input.accountId)
        )
            throw new BulkError(
                "Opening balances and unavailable records must be edited through their wallet."
            )
        checkMovements(row.entries, ownerId)
        if (row.type === "TRANSFER") transferLegs(row.entries)
        else if (row.entries.length !== 1)
            throw new BulkError("An affected transaction is unavailable.")
    }
    return rows
}
async function plan(
    tx: Prisma.TransactionClient,
    input: BulkInput,
    ownerId: string
) {
    let rows = await selection(tx, input, ownerId)
    if (
        input.operation === "WALLET" &&
        !(await tx.accountWallet.findFirst({
            where: {
                id: input.targetId,
                financialAccountId: input.accountId,
                archivedAt: null,
                wallet: { ownerId, archivedAt: null },
            },
            select: { id: true },
        }))
    )
        throw new BulkError("Choose an active wallet in this account.")
    await lockAllocations(tx, [
        ...rows.flatMap((r) => r.entries.map((e) => e.accountWalletId)),
        ...(input.operation === "WALLET" ? [input.targetId] : []),
    ])
    const lockedIds = rows.map((r) => r.id)
    await tx.$queryRaw`SELECT id FROM "transaction" WHERE id IN (${Prisma.join(lockedIds)}) ORDER BY id FOR UPDATE`
    rows = await selection(tx, input, ownerId)
    if (
        rows.length !== lockedIds.length ||
        rows.some((r) => !lockedIds.includes(r.id))
    )
        throw new BulkError("The series scope changed. Review again.")
    const rules = [
        ...new Map(
            rows
                .filter((r) => r.occurrence)
                .map((r) => [r.occurrence!.ruleId, r.occurrence!.rule])
        ).values(),
    ].sort((a, b) => a.id.localeCompare(b.id))
    if (
        rules.some(
            (r) =>
                r.source.financialAccountId !== input.accountId ||
                r.source.wallet.ownerId !== ownerId ||
                (r.destination &&
                    (r.destination.financialAccountId !== input.accountId ||
                        r.destination.wallet.ownerId !== ownerId))
        )
    )
        throw new BulkError("An affected series is unavailable.")
    const wallet =
        input.operation === "WALLET"
            ? await tx.accountWallet.findFirst({
                  where: {
                      id: input.targetId,
                      financialAccountId: input.accountId,
                      archivedAt: null,
                      wallet: { ownerId, archivedAt: null },
                  },
                  include: { wallet: true },
              })
            : null
    const category =
        input.operation === "CATEGORY"
            ? await tx.category.findFirst({
                  where: {
                      id: input.targetId,
                      financialAccountId: input.accountId,
                      archivedAt: null,
                  },
                  include: { parent: true },
              })
            : null
    if (
        input.operation === "WALLET" &&
        (!wallet ||
            rows.some(
                (r) =>
                    r.type === "TRANSFER" ||
                    r.entries[0].accountWallet.wallet.currency !==
                        wallet.wallet.currency
            ) ||
            (input.scope !== "ONLY" &&
                rules.some(
                    (r) =>
                        r.type === "TRANSFER" ||
                        r.source.wallet.currency !== wallet.wallet.currency
                )))
    )
        throw new BulkError(
            "Select only expenses/income in one currency and choose an active wallet in that currency. Transfers must be moved individually."
        )
    if (
        input.operation === "CATEGORY" &&
        (!category ||
            category.parent?.archivedAt ||
            rows.some((r) => r.type !== category.type) ||
            (input.scope !== "ONLY" &&
                rules.some((r) => r.type !== category.type)))
    )
        throw new BulkError(
            "Choose an active category matching every affected transaction and recurring template. Select only expenses or only income."
        )
    const needed = rows.filter(
        (r) =>
            input.operation === "POSTED" &&
            r.status === "PENDING" &&
            r.type === "TRANSFER" &&
            r.entries[0].accountWallet.wallet.currency !==
                r.entries[1].accountWallet.wallet.currency
    )
    if (input.fx.some((f) => !needed.some((r) => r.id === f.id)))
        throw new BulkError(
            "The FX transfer scope changed. Review the action again."
        )
    const fx = needed.map((row) => {
        const { source, destination } = transferLegs(row.entries),
            actual = input.fx.find((f) => f.id === row.id)
        return {
            id: row.id,
            name: row.name,
            date: row.occurredAt.toISOString().slice(0, 10),
            sent: actual?.sent ?? source.amount.abs().toFixed(2),
            received: actual?.received ?? destination.amount.toFixed(2),
            sourceCurrency: source.accountWallet.wallet.currency,
            destinationCurrency: destination.accountWallet.wallet.currency,
        }
    })
    const changes = rows.map((row) => {
        const status =
            input.operation === "POSTED" || input.operation === "PENDING"
                ? input.operation
                : row.status
        const actual = fx.find((f) => f.id === row.id)
        const entries = row.entries.map((e) => ({
            ...e,
            accountWalletId: wallet?.id ?? e.accountWalletId,
            accountWallet: wallet
                ? { ...e.accountWallet, ...wallet }
                : e.accountWallet,
            categoryId: category?.id ?? e.categoryId,
            category: category ?? e.category,
            amount: actual
                ? new Prisma.Decimal(
                      e.amount.isNegative()
                          ? `-${actual.sent}`
                          : actual.received
                  )
                : e.amount,
        }))
        return {
            before: row,
            after: { ...row, status, entries, version: row.version + 1 },
            changed:
                input.operation === "DELETE" ||
                (input.operation !== "POSTED" &&
                    input.operation !== "PENDING") ||
                row.status !== status,
        }
    })
    const balances = new Map<
        string,
        { id: string; wallet: string; currency: string; amount: bigint }
    >()
    for (const change of changes)
        if (change.changed)
            for (const { row, sign } of [
                { row: change.before, sign: -1 },
                ...(input.operation === "DELETE"
                    ? []
                    : [{ row: change.after, sign: 1 }]),
            ]) {
                if (row.status !== "POSTED") continue
                for (const e of row.entries) {
                    const item = balances.get(e.accountWalletId) ?? {
                        id: e.accountWalletId,
                        wallet: e.accountWallet.wallet.name,
                        currency: e.accountWallet.wallet.currency,
                        amount: BigInt(0),
                    }
                    item.amount +=
                        moneyCents(e.amount.toFixed(2)) * BigInt(sign)
                    balances.set(item.id, item)
                }
            }
    const snapshot = hash({
        input: {
            ...input,
            fx: fx
                .map((f) => ({ id: f.id, sent: f.sent, received: f.received }))
                .sort((a, b) => a.id.localeCompare(b.id)),
        },
        rows: rows.map((r) => ({
            snapshot: transferSnapshot(r),
            spread: r.expenseSpread,
            slot: r.occurrence?.scheduledFor,
        })),
        rules: rules.map((r) => ({
            id: r.id,
            version: r.version,
            source: r.sourceId,
            destination: r.destinationId,
            category: r.categoryId,
            stopped: r.stoppedAt,
            paused: r.pausedAt,
        })),
        target: wallet
            ? {
                  id: wallet.id,
                  name: wallet.wallet.name,
                  currency: wallet.wallet.currency,
              }
            : category
              ? {
                    id: category.id,
                    name: category.name,
                    type: category.type,
                    parentId: category.parentId,
                    parentName: category.parent?.name ?? null,
                }
              : null,
    })
    const preview: BulkPreview = {
        snapshot,
        count: rows.length,
        changedCount: changes.filter((c) => c.changed).length,
        postedCount: rows.filter((r) => r.status === "POSTED").length,
        historicalCount: rows.filter(
            (r) =>
                r.occurredAt.toISOString().slice(0, 10) <
                new Date().toISOString().slice(0, 10)
        ).length,
        seriesCount: rules.length,
        balances: [...balances.values()]
            .filter((r) => r.amount !== BigInt(0))
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((r) => ({ ...r, amount: centsMoney(r.amount) })),
        fx,
    }
    return { preview, changes, rules }
}
export async function previewBulkTransactions(input: BulkInput) {
    const { user } = await requireVerifiedSession()
    return prisma.$transaction(
        async (tx) => {
            const ownerId = await lockFinancialAccess(
                tx,
                input.accountId,
                user.id
            )
            return (await plan(tx, input, ownerId)).preview
        },
        { timeout: 30_000, maxWait: 10_000 }
    )
}
export async function applyBulkTransactions(
    input: BulkInput,
    snapshot: string,
    confirmed: boolean,
    fxConfirmed: boolean
) {
    const { user } = await requireVerifiedSession()
    if (!confirmed || !/^[a-f0-9]{64}$/.test(snapshot))
        throw new BulkError(
            "Review and confirm the preview before applying changes."
        )
    return prisma.$transaction(
        async (tx) => {
            const ownerId = await lockFinancialAccess(
                tx,
                input.accountId,
                user.id
            )
            const requestFingerprint = hash(input)
            const receipt = await tx.transactionChange.findFirst({
                where: {
                    actorId: user.id,
                    action: "BULK_COMPLETED",
                    AND: [
                        {
                            snapshot: {
                                path: ["bulkRequestId"],
                                equals: input.requestId,
                            },
                        },
                        {
                            snapshot: {
                                path: ["financialAccountId"],
                                equals: input.accountId,
                            },
                        },
                    ],
                },
                select: { snapshot: true },
            })
            if (receipt) {
                const prior = receipt.snapshot as {
                    requestFingerprint: string
                    count: number
                }
                if (prior.requestFingerprint !== requestFingerprint)
                    throw new BulkError(
                        "This request was already used for another action. Refresh before continuing."
                    )
                return { count: prior.count }
            }
            const { preview, changes, rules } = await plan(tx, input, ownerId)
            if (preview.snapshot !== snapshot)
                throw new BulkError(
                    "Transactions, series or wallets changed after the preview. Nothing was changed; review again."
                )
            if (
                preview.fx.length &&
                (!fxConfirmed ||
                    preview.fx.some(
                        (row) => !input.fx.some((f) => f.id === row.id)
                    ))
            )
                throw new BulkError(
                    "Review and explicitly confirm actual amounts for every FX transfer."
                )
            const changed = changes.filter((c) => c.changed),
                ids = changed.map((c) => c.before.id)
            if (!ids.length)
                throw new BulkError(
                    "These transactions already have the requested status."
                )
            const appliedAt = new Date()
            const audits: Prisma.TransactionChangeCreateManyInput[] =
                changed.map(({ before, after }) => {
                    const rule = before.occurrence?.rule
                    const original = before.changes[0]?.snapshot
                    const fingerprint =
                        original &&
                        typeof original === "object" &&
                        !Array.isArray(original) &&
                        typeof original.requestFingerprint === "string"
                            ? original.requestFingerprint
                            : null
                    return {
                        transactionId: before.id,
                        liveTransactionId: before.id,
                        actorId: user.id,
                        action:
                            input.operation === "DELETE"
                                ? "DELETED"
                                : input.operation === "POSTED" ||
                                    input.operation === "PENDING"
                                  ? "STATUS_CHANGED"
                                  : "UPDATED",
                        snapshot: {
                            ...sharedAuditContext(
                                ownerId,
                                user.id,
                                input.accountId
                            ),
                            financialAccountId: input.accountId,
                            createdById: before.createdById,
                            idempotencyKey: before.idempotencyKey,
                            requestFingerprint: fingerprint,
                            bulkRequestId: input.requestId,
                            bulkScope: input.scope,
                            bulkOperation: input.operation,
                            ruleId: before.occurrence?.ruleId ?? null,
                            scheduledFor:
                                before.occurrence?.scheduledFor.toISOString() ??
                                null,
                            ...transferSnapshot(before),
                            spread: before.expenseSpread
                                ? {
                                      startMonth:
                                          before.expenseSpread.startMonth,
                                      monthCount:
                                          before.expenseSpread.monthCount,
                                  }
                                : null,
                            before: transferSnapshot(before),
                            after:
                                input.operation === "DELETE"
                                    ? null
                                    : transferSnapshot(after),
                            templateChanges:
                                input.scope === "ONLY" || !rule
                                    ? null
                                    : {
                                          id: rule.id,
                                          version: rule.version,
                                          before: {
                                              sourceId: rule.sourceId,
                                              categoryId: rule.categoryId,
                                              stoppedAt:
                                                  rule.stoppedAt?.toISOString() ??
                                                  null,
                                              pausedAt:
                                                  rule.pausedAt?.toISOString() ??
                                                  null,
                                          },
                                          after: {
                                              sourceId:
                                                  input.operation === "WALLET"
                                                      ? input.targetId
                                                      : rule.sourceId,
                                              categoryId:
                                                  input.operation === "CATEGORY"
                                                      ? input.targetId
                                                      : rule.categoryId,
                                              stoppedAt:
                                                  input.operation === "DELETE"
                                                      ? appliedAt.toISOString()
                                                      : (rule.stoppedAt?.toISOString() ??
                                                        null),
                                              pausedAt:
                                                  rule.pausedAt?.toISOString() ??
                                                  null,
                                              version: rule.version + 1,
                                          },
                                      },
                        } as Prisma.InputJsonValue,
                    }
                })
            for (let index = 0; index < audits.length; index += 500)
                await tx.transactionChange.createMany({
                    data: audits.slice(index, index + 500),
                })
            if (input.operation === "DELETE") {
                await tx.recurrenceOccurrence.updateMany({
                    where: { transactionId: { in: ids } },
                    data: { skippedAt: appliedAt },
                })
                const removed = await tx.transaction.deleteMany({
                    where: { id: { in: ids } },
                })
                if (removed.count !== ids.length)
                    throw new BulkError(
                        "The selection changed; nothing was deleted."
                    )
            } else {
                if (input.operation === "WALLET")
                    await tx.ledgerEntry.updateMany({
                        where: { transactionId: { in: ids } },
                        data: { accountWalletId: input.targetId },
                    })
                if (input.operation === "CATEGORY")
                    await tx.ledgerEntry.updateMany({
                        where: { transactionId: { in: ids } },
                        data: { categoryId: input.targetId },
                    })
                const changedById = new Map(
                    changed.map((c) => [c.before.id, c.before])
                )
                const fxUpdates = preview.fx.flatMap((actual) =>
                    changedById.get(actual.id)!.entries.map((e) => ({
                        id: e.id,
                        amount: e.amount.isNegative()
                            ? `-${actual.sent}`
                            : actual.received,
                    }))
                )
                for (let index = 0; index < fxUpdates.length; index += 500) {
                    const batch = fxUpdates.slice(index, index + 500)
                    const count =
                        await tx.$executeRaw`UPDATE ledger_entry AS e SET amount=v.amount FROM (VALUES ${Prisma.join(batch.map((e) => Prisma.sql`(${e.id}, ${new Prisma.Decimal(e.amount)}::numeric)`))}) AS v(id,amount) WHERE e.id=v.id`
                    if (count !== batch.length)
                        throw new BulkError(
                            "The FX selection changed. Nothing was updated."
                        )
                }
                const updated = await tx.transaction.updateMany({
                    where: { id: { in: ids } },
                    data: {
                        ...(input.operation === "POSTED" ||
                        input.operation === "PENDING"
                            ? { status: input.operation }
                            : {}),
                        version: { increment: 1 },
                    },
                })
                if (updated.count !== ids.length)
                    throw new BulkError(
                        "The selection changed; nothing was updated."
                    )
            }
            const ruleIds = new Set(
                changed.flatMap((c) =>
                    c.before.occurrence ? [c.before.occurrence.ruleId] : []
                )
            )
            const affectedRules = rules.filter((r) => ruleIds.has(r.id))
            if (affectedRules.length) {
                const updated = await tx.recurrenceRule.updateMany({
                    where: {
                        OR: affectedRules.map((r) => ({
                            id: r.id,
                            version: r.version,
                        })),
                    },
                    data: {
                        version: { increment: 1 },
                        ...(input.scope !== "ONLY"
                            ? input.operation === "DELETE"
                                ? {
                                      stoppedAt: appliedAt,
                                      nextOccurrenceAt: null,
                                  }
                                : input.operation === "CATEGORY"
                                  ? { categoryId: input.targetId }
                                  : input.operation === "WALLET"
                                    ? { sourceId: input.targetId }
                                    : {}
                            : {}),
                    },
                })
                if (updated.count !== affectedRules.length)
                    throw new BulkError(
                        "An affected series changed. Nothing was updated."
                    )
            }
            await tx.transactionChange.create({
                data: {
                    transactionId: ids[0],
                    actorId: user.id,
                    action: "BULK_COMPLETED",
                    snapshot: {
                        ...sharedAuditContext(
                            ownerId,
                            user.id,
                            input.accountId
                        ),
                        financialAccountId: input.accountId,
                        bulkRequestId: input.requestId,
                        requestFingerprint,
                        count: ids.length,
                        operation: input.operation,
                        scope: input.scope,
                    },
                },
            })
            return { count: ids.length }
        },
        { timeout: 60_000, maxWait: 10_000 }
    )
}
