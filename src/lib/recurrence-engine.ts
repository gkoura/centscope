import "server-only"
import { sharedAuditContext } from "@/lib/financial-access"
import { randomUUID } from "node:crypto"
import { Prisma, type RecurrenceRule } from "@/generated/prisma/client"
import type { TransactionInput } from "@/lib/transaction-input"
import {
    nextSlot,
    creationHorizon,
    firstIndexAfter,
    localToday,
    type RepeatInput,
} from "@/lib/recurrence-input"
import { shiftMonth, validSpread } from "@/lib/expense-spread"

export class RecurrenceError extends Error {}
export function ruleInput(rule: RecurrenceRule): RepeatInput {
    return {
        frequency: rule.frequency,
        interval: rule.interval,
        timezone: rule.timezone,
        endsOn: rule.endsAt?.toISOString().slice(0, 10) ?? null,
        endAfter: rule.endAfter,
        occurrenceStatus: "PENDING",
    }
}
export function spreadOffset(date: string, start: string) {
    return (
        (Number(start.slice(0, 4)) - Number(date.slice(0, 4))) * 12 +
        Number(start.slice(5)) -
        Number(date.slice(5))
    )
}
export function templateSpread(
    rule: Pick<RecurrenceRule, "spreadMonthCount" | "spreadMonthOffset">,
    date: string
) {
    if (!rule.spreadMonthCount) return null
    const value = {
        startMonth: shiftMonth(date.slice(0, 7), rule.spreadMonthOffset),
        monthCount: rule.spreadMonthCount,
    }
    if (!validSpread(value))
        throw new RecurrenceError(
            "The expense spread extends outside supported dates."
        )
    return value
}
export async function createRuleForTransaction(
    tx: Prisma.TransactionClient,
    input: TransactionInput,
    transactionId: string,
    userId: string
) {
    if (!input.repeat) return
    const next = nextSlot(input.date, input.repeat, 1)
    const rule = await tx.recurrenceRule.create({
        data: {
            createdById: userId,
            type: input.type,
            name: input.name,
            notes: input.notes,
            sourceId: input.accountWalletId,
            amount: input.amount,
            categoryId: input.categoryId,
            frequency: input.repeat.frequency,
            interval: input.repeat.interval,
            timezone: input.repeat.timezone,
            occurrenceStatus: "PENDING",
            startsAt: new Date(`${input.date}T00:00:00Z`),
            endsAt: input.repeat.endsOn
                ? new Date(`${input.repeat.endsOn}T00:00:00Z`)
                : null,
            endAfter: input.repeat.endAfter,
            nextOccurrenceAt: next ? new Date(`${next}T00:00:00Z`) : null,
            spreadMonthCount: input.spread?.monthCount ?? null,
            spreadMonthOffset: input.spread
                ? spreadOffset(input.date, input.spread.startMonth)
                : 0,
            occurrences: {
                create: {
                    scheduledFor: new Date(`${input.date}T00:00:00Z`),
                    transactionId,
                },
            },
        },
    })
    await generateRule(tx, rule.id, userId, input.financialAccountId)
}
export async function generateRule(
    tx: Prisma.TransactionClient,
    ruleId: string,
    userId: string,
    accountId: string,
    now = new Date()
) {
    const rule = await tx.recurrenceRule.findFirst({
        where: { id: ruleId, source: { financialAccountId: accountId } },
        include: {
            source: { include: { wallet: true, financialAccount: true } },
            destination: { include: { wallet: true, financialAccount: true } },
            category: { include: { parent: true } },
        },
    })
    if (!rule || rule.pausedAt || rule.stoppedAt || !rule.nextOccurrenceAt)
        return 0
    const ownerId = rule.source.financialAccount.ownerId
    if (
        rule.source.archivedAt ||
        rule.source.wallet.archivedAt ||
        rule.source.wallet.ownerId !== ownerId ||
        rule.source.financialAccount.archivedAt ||
        (rule.type === "TRANSFER"
            ? !rule.destination ||
              rule.destination.archivedAt ||
              rule.destination.wallet.archivedAt ||
              rule.destination.financialAccount.archivedAt ||
              rule.destination.wallet.ownerId !== ownerId ||
              rule.destination.financialAccount.ownerId !== ownerId ||
              rule.destinationId === rule.sourceId ||
              rule.destination.financialAccountId !==
                  rule.source.financialAccountId ||
              rule.categoryId !== null
            : !rule.category ||
              rule.category.archivedAt ||
              rule.category.parent?.archivedAt ||
              rule.category.type !== rule.type ||
              rule.category.financialAccountId !==
                  rule.source.financialAccountId)
    ) {
        await tx.recurrenceRule.update({
            where: { id: rule.id },
            data: { pausedAt: now, version: { increment: 1 } },
        })
        return 0
    }
    const today = localToday(rule.timezone, now),
        start = rule.startsAt.toISOString().slice(0, 10),
        settings = ruleInput(rule)
    const horizon = creationHorizon(start, settings, today)
    let index = rule.nextIndex
    const dates: string[] = []
    let date = nextSlot(start, settings, index)
    while (date && date <= horizon && dates.length < 50) {
        dates.push(date)
        index++
        date = nextSlot(start, settings, index)
    }
    if (!dates.length) return 0
    const existing = await tx.recurrenceOccurrence.findMany({
        where: {
            ruleId: rule.id,
            scheduledFor: { in: dates.map((d) => new Date(`${d}T00:00:00Z`)) },
        },
        select: { scheduledFor: true },
    })
    const seen = new Set(
        existing.map((row) => row.scheduledFor.toISOString().slice(0, 10))
    )
    const pending = dates
        .filter((d) => !seen.has(d))
        .map((d) => ({
            id: randomUUID(),
            date: d,
            spread: templateSpread(rule, d),
        }))
    const amount = new Prisma.Decimal(rule.amount).mul(
        rule.type === "EXPENSE" || rule.type === "TRANSFER" ? -1 : 1
    )
    if (pending.length) {
        await tx.transaction.createMany({
            data: pending.map((row) => ({
                id: row.id,
                type: rule.type,
                name: rule.name,
                notes: rule.notes,
                status: "PENDING",
                occurredAt: new Date(`${row.date}T00:00:00Z`),
                createdById: userId,
                idempotencyKey: `recurring:${rule.id}:${row.date}`,
            })),
        })
        await tx.ledgerEntry.createMany({
            data: pending.flatMap((row) => [
                {
                    transactionId: row.id,
                    accountWalletId: rule.sourceId,
                    financialAccountId: rule.source.financialAccountId,
                    categoryId: rule.categoryId,
                    amount,
                },
                ...(rule.type === "TRANSFER"
                    ? [
                          {
                              transactionId: row.id,
                              accountWalletId: rule.destinationId!,
                              financialAccountId:
                                  rule.destination!.financialAccountId,
                              categoryId: null,
                              amount: new Prisma.Decimal(
                                  rule.destinationAmount ?? rule.amount
                              ),
                          },
                      ]
                    : []),
            ]),
        })
        await tx.recurrenceOccurrence.createMany({
            data: pending.map((row) => ({
                ruleId: rule.id,
                scheduledFor: new Date(`${row.date}T00:00:00Z`),
                transactionId: row.id,
            })),
        })
        const spreads = pending
            .filter((row) => row.spread)
            .map((row) => ({ transactionId: row.id, ...row.spread! }))
        if (spreads.length) await tx.expenseSpread.createMany({ data: spreads })
        await tx.transactionChange.createMany({
            data: pending.map((row) => ({
                transactionId: row.id,
                liveTransactionId: row.id,
                actorId: userId,
                action: "CREATED",
                snapshot: {
                    ...sharedAuditContext(
                        ownerId,
                        userId,
                        rule.source.financialAccountId
                    ),
                    financialAccountId: rule.source.financialAccountId,
                    financialAccountIds: [
                        ...new Set([
                            rule.source.financialAccountId,
                            ...(rule.destination
                                ? [rule.destination.financialAccountId]
                                : []),
                        ]),
                    ],
                    ...(rule.type === "TRANSFER"
                        ? {
                              entries: [
                                  {
                                      accountWalletId: rule.sourceId,
                                      financialAccountId:
                                          rule.source.financialAccountId,
                                      walletName: rule.source.wallet.name,
                                      currency: rule.source.wallet.currency,
                                      amount: amount.toFixed(2),
                                  },
                                  {
                                      accountWalletId: rule.destinationId!,
                                      financialAccountId:
                                          rule.destination!.financialAccountId,
                                      walletName: rule.destination!.wallet.name,
                                      currency:
                                          rule.destination!.wallet.currency,
                                      amount: new Prisma.Decimal(
                                          rule.destinationAmount ?? rule.amount
                                      ).toFixed(2),
                                  },
                              ],
                          }
                        : {}),
                    accountWalletId: rule.sourceId,
                    categoryId: rule.categoryId,
                    name: rule.name,
                    type: rule.type,
                    notes: rule.notes,
                    status: "PENDING",
                    date: row.date,
                    amount: amount.toFixed(2),
                    currency: rule.source.wallet.currency,
                    version: 1,
                    ruleId: rule.id,
                    scheduledFor: row.date,
                    spread: row.spread,
                },
            })),
        })
    }
    await tx.recurrenceRule.update({
        where: { id: rule.id },
        data: {
            occurrenceStatus: "PENDING",
            nextIndex: index,
            nextOccurrenceAt: date ? new Date(`${date}T00:00:00Z`) : null,
            version: { increment: 1 },
        },
    })
    return pending.length
}

export async function updateSeries(
    tx: Prisma.TransactionClient,
    input: TransactionInput,
    transactionId: string,
    expectedVersion: number,
    userId: string,
    ownerId: string
) {
    const selected = await tx.transaction.findFirst({
        where: {
            id: transactionId,
            entries: { some: { financialAccountId: input.financialAccountId } },
        },
        include: { occurrence: { include: { rule: true } } },
    })
    const occurrence = selected?.occurrence,
        rule = occurrence?.rule
    if (
        !selected ||
        !occurrence ||
        !rule ||
        selected.version !== expectedVersion ||
        rule.version !== input.expectedRuleVersion
    )
        throw new RecurrenceError(
            "This series changed. Reload before editing its occurrences."
        )
    if (!input.repeat)
        throw new RecurrenceError(
            "Keep a repeat schedule for series edits. Use Stop on the recurring page to end the series."
        )
    if (input.date !== selected.occurredAt.toISOString().slice(0, 10))
        throw new RecurrenceError(
            "Series edits preserve occurrence dates. Choose Only this occurrence to change its date."
        )
    const [wallet, category, rows] = await Promise.all([
        tx.accountWallet.findFirst({
            where: {
                id: input.accountWalletId,
                financialAccountId: input.financialAccountId,
                archivedAt: null,
                wallet: { ownerId, archivedAt: null },
            },
            include: { wallet: true },
        }),
        tx.category.findFirst({
            where: {
                id: input.categoryId,
                financialAccountId: input.financialAccountId,
                type: input.type,
                archivedAt: null,
                OR: [{ parentId: null }, { parent: { archivedAt: null } }],
            },
        }),
        tx.transaction.findMany({
            where: {
                occurrence: {
                    ruleId: rule.id,
                    ...(input.editScope === "FUTURE"
                        ? { scheduledFor: { gte: occurrence.scheduledFor } }
                        : {}),
                },
            },
            include: {
                expenseSpread: true,
                entries: {
                    include: { accountWallet: { include: { wallet: true } } },
                },
                occurrence: true,
            },
        }),
    ])
    if (
        !wallet ||
        !category ||
        !rows.length ||
        rows.some(
            (row) =>
                row.entries.length !== 1 ||
                row.entries[0].financialAccountId !==
                    input.financialAccountId ||
                row.entries[0].accountWallet.archivedAt ||
                row.entries[0].accountWallet.wallet.archivedAt ||
                row.entries[0].accountWallet.wallet.ownerId !== ownerId ||
                row.entries[0].accountWallet.wallet.currency !==
                    wallet.wallet.currency
        )
    )
        throw new RecurrenceError(
            "Choose active categories and wallets in the original currency. An affected occurrence may be unavailable."
        )
    const ids = rows.map((row) => row.id),
        amount = new Prisma.Decimal(input.amount).mul(
            input.type === "EXPENSE" ? -1 : 1
        )
    const spreadTemplate = {
        spreadMonthCount:
            input.type === "EXPENSE"
                ? (input.spread?.monthCount ?? null)
                : null,
        spreadMonthOffset: input.spread
            ? spreadOffset(input.date, input.spread.startMonth)
            : 0,
    }
    const snapshot = (row: (typeof rows)[number]) => ({
        name: row.name,
        type: row.type,
        status: row.status,
        notes: row.notes,
        date: row.occurredAt.toISOString().slice(0, 10),
        amount: row.entries[0].amount.toFixed(2),
        categoryId: row.entries[0].categoryId,
        accountWalletId: row.entries[0].accountWalletId,
        version: row.version,
        spread: row.expenseSpread
            ? {
                  startMonth: row.expenseSpread.startMonth,
                  monthCount: row.expenseSpread.monthCount,
              }
            : null,
    })
    const audits = rows.map((row) => ({
        transactionId: row.id,
        liveTransactionId: row.id,
        actorId: userId,
        action: "UPDATED",
        snapshot: {
            ...sharedAuditContext(ownerId, userId, input.financialAccountId),
            financialAccountId: input.financialAccountId,
            ruleId: rule.id,
            scope: input.editScope!,
            ruleBefore: ruleInput(rule),
            ruleAfter: input.repeat!,
            currency: wallet.wallet.currency,
            before: snapshot(row),
            after: {
                name: input.name,
                type: input.type,
                status: input.status,
                notes: input.notes,
                date: row.occurredAt.toISOString().slice(0, 10),
                amount: amount.toFixed(2),
                categoryId: input.categoryId,
                accountWalletId: input.accountWalletId,
                version: row.version + 1,
                spread: templateSpread(
                    spreadTemplate,
                    row.occurredAt.toISOString().slice(0, 10)
                ),
            },
        },
    }))
    await tx.transaction.updateMany({
        where: { id: { in: ids } },
        data: {
            name: input.name,
            type: input.type,
            status: input.status,
            notes: input.notes,
            version: { increment: 1 },
        },
    })
    await tx.ledgerEntry.updateMany({
        where: { transactionId: { in: ids } },
        data: {
            amount,
            categoryId: input.categoryId,
            accountWalletId: input.accountWalletId,
        },
    })
    await tx.expenseSpread.deleteMany({ where: { transactionId: { in: ids } } })
    const spreads = audits
        .filter((row) => row.snapshot.after.spread)
        .map((row) => ({
            transactionId: row.transactionId,
            ...row.snapshot.after.spread!,
        }))
    if (spreads.length) await tx.expenseSpread.createMany({ data: spreads })
    for (let start = 0; start < audits.length; start += 500)
        await tx.transactionChange.createMany({
            data: audits.slice(start, start + 500),
        })
    // Existing dates are immutable in a series edit; cadence changes affect only ungenerated slots.
    const latest = await tx.recurrenceOccurrence.findFirst({
        where: { ruleId: rule.id },
        orderBy: { scheduledFor: "desc" },
    })
    const anchor = rule.startsAt.toISOString().slice(0, 10),
        threshold = latest?.scheduledFor.toISOString().slice(0, 10) ?? anchor
    const nextIndex = firstIndexAfter(anchor, input.repeat, threshold)
    const next = nextSlot(anchor, input.repeat, nextIndex)
    await tx.recurrenceRule.update({
        where: { id: rule.id },
        data: {
            type: input.type,
            name: input.name,
            notes: input.notes,
            sourceId: input.accountWalletId,
            categoryId: input.categoryId,
            amount: input.amount,
            ...spreadTemplate,
            frequency: input.repeat.frequency,
            interval: input.repeat.interval,
            timezone: input.repeat.timezone,
            occurrenceStatus: "PENDING",
            endsAt: input.repeat.endsOn
                ? new Date(`${input.repeat.endsOn}T00:00:00Z`)
                : null,
            endAfter: input.repeat.endAfter,
            nextIndex,
            nextOccurrenceAt: rule.stoppedAt
                ? null
                : next
                  ? new Date(`${next}T00:00:00Z`)
                  : null,
            version: { increment: 1 },
        },
    })
    await generateRule(tx, rule.id, userId, input.financialAccountId)
}
