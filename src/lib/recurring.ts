import "server-only"
import { prisma } from "@/lib/prisma"
import { requireVerifiedSession } from "@/lib/auth/session"
import { generateRule, RecurrenceError } from "@/lib/recurrence-engine"
import { nextSlot, localToday, creationHorizon } from "@/lib/recurrence-input"
import { ruleInput } from "@/lib/recurrence-engine"

async function processRecurring(accountId: string, userId: string) {
    const where = {
        createdById: userId,
        pausedAt: null,
        stoppedAt: null,
        nextOccurrenceAt: { not: null },
        source: {
            financialAccountId: accountId,
            financialAccount: { ownerId: userId, archivedAt: null },
            archivedAt: null,
            wallet: { ownerId: userId, archivedAt: null },
        },
    }
    const eligible = (
        rule: Awaited<ReturnType<typeof prisma.recurrenceRule.findMany>>[number]
    ) =>
        Boolean(
            rule.nextOccurrenceAt &&
            rule.nextOccurrenceAt.toISOString().slice(0, 10) <=
                creationHorizon(
                    rule.startsAt.toISOString().slice(0, 10),
                    ruleInput(rule),
                    localToday(rule.timezone)
                )
        )
    const rules = (
        await prisma.recurrenceRule.findMany({
            where,
            orderBy: [{ nextOccurrenceAt: "asc" }, { id: "asc" }],
        })
    )
        .filter(eligible)
        .slice(0, 20)
    let created = 0,
        failed = 0
    const deadline = Date.now() + 240_000
    for (const rule of rules) {
        if (Date.now() > deadline) break
        try {
            created += await prisma.$transaction(
                async (tx) => {
                    const account = await tx.$queryRaw<
                        { id: string }[]
                    >`SELECT id FROM financial_account WHERE id=${accountId} AND "ownerId"=${userId} AND "archivedAt" IS NULL FOR UPDATE`
                    return account.length
                        ? generateRule(tx, rule.id, userId)
                        : 0
                },
                { timeout: 20_000, maxWait: 10_000 }
            )
        } catch {
            failed++
        }
    }
    const hasMore = (await prisma.recurrenceRule.findMany({ where })).some(
        eligible
    )
    return { created, failed, hasMore }
}
export async function syncOwnedRecurring(accountId: string) {
    const { user } = await requireVerifiedSession()
    if (typeof accountId !== "string" || !accountId || accountId.length > 128)
        throw new RecurrenceError("Choose a valid account.")
    const account = await prisma.financialAccount.findFirst({
        where: { id: accountId, ownerId: user.id, archivedAt: null },
        select: { id: true },
    })
    if (!account) throw new RecurrenceError("This account is unavailable.")
    return processRecurring(accountId, user.id)
}
export async function listOwnedRecurring(accountId: string) {
    const { user } = await requireVerifiedSession()
    const rules = await prisma.recurrenceRule.findMany({
        where: {
            createdById: user.id,
            source: {
                financialAccountId: accountId,
                financialAccount: { ownerId: user.id, archivedAt: null },
            },
        },
        include: {
            source: { include: { wallet: true } },
            category: { include: { parent: true } },
            occurrences: {
                where: { transactionId: { not: null } },
                orderBy: { scheduledFor: "desc" },
                take: 1,
                select: { transactionId: true },
            },
            _count: { select: { occurrences: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    })
    const upcoming = rules.length
        ? await prisma.recurrenceOccurrence.findMany({
              where: {
                  ruleId: { in: rules.map((rule) => rule.id) },
                  transaction: {
                      status: "PENDING",
                      occurredAt: {
                          gte: new Date(
                              `${new Date().toISOString().slice(0, 10)}T00:00:00Z`
                          ),
                      },
                  },
              },
              select: {
                  ruleId: true,
                  transactionId: true,
                  transaction: { select: { occurredAt: true } },
              },
              orderBy: { transaction: { occurredAt: "asc" } },
          })
        : []
    return rules.map((rule) => ({
        ...rule,
        upcoming: upcoming
            .filter((row) => row.ruleId === rule.id)
            .slice(0, 5)
            .map((row) => ({
                id: row.transactionId!,
                date: row.transaction!.occurredAt.toISOString().slice(0, 10),
            })),
    }))
}
export async function commandOwnedRecurring(form: FormData) {
    const { user } = await requireVerifiedSession()
    const accountId = String(form.get("financialAccountId") ?? ""),
        ruleId = String(form.get("ruleId") ?? ""),
        command = String(form.get("command") ?? ""),
        version = Number(form.get("expectedVersion"))
    if (
        !accountId ||
        accountId.length > 128 ||
        !ruleId ||
        ruleId.length > 128 ||
        !["pause", "resume", "stop", "skip"].includes(command) ||
        !Number.isSafeInteger(version) ||
        version < 1
    )
        throw new RecurrenceError("Reload this schedule before making changes.")
    await prisma.$transaction(
        async (tx) => {
            const account = await tx.$queryRaw<
                { id: string }[]
            >`SELECT id FROM financial_account WHERE id=${accountId} AND "ownerId"=${user.id} AND "archivedAt" IS NULL FOR UPDATE`
            if (!account.length)
                throw new RecurrenceError("This account is unavailable.")
            const rule = await tx.recurrenceRule.findFirst({
                where: {
                    id: ruleId,
                    createdById: user.id,
                    source: { financialAccountId: accountId },
                },
            })
            if (!rule || rule.version !== version)
                throw new RecurrenceError(
                    "This schedule changed. Refresh before trying again."
                )
            if (rule.stoppedAt)
                throw new RecurrenceError("This schedule has been stopped.")
            const now = new Date()
            if (command === "skip") {
                if (rule.pausedAt)
                    throw new RecurrenceError(
                        "Resume this schedule before skipping a payment."
                    )
                const upcoming = await tx.recurrenceOccurrence.findFirst({
                    where: {
                        ruleId,
                        transaction: {
                            status: "PENDING",
                            occurredAt: {
                                gte: new Date(
                                    `${localToday(rule.timezone)}T00:00:00Z`
                                ),
                            },
                        },
                    },
                    orderBy: { transaction: { occurredAt: "asc" } },
                    include: {
                        transaction: {
                            include: { entries: true, expenseSpread: true },
                        },
                    },
                })
                if (upcoming?.transaction) {
                    const payment = upcoming.transaction,
                        entry = payment.entries[0]
                    if (
                        payment.entries.length !== 1 ||
                        entry.financialAccountId !== accountId
                    )
                        throw new RecurrenceError(
                            "This occurrence is unavailable."
                        )
                    await tx.transactionChange.create({
                        data: {
                            transactionId: payment.id,
                            liveTransactionId: payment.id,
                            actorId: user.id,
                            action: "DELETED",
                            snapshot: {
                                financialAccountId: accountId,
                                ruleId,
                                scheduledFor:
                                    upcoming.scheduledFor.toISOString(),
                                name: payment.name,
                                type: payment.type,
                                status: payment.status,
                                date: payment.occurredAt
                                    .toISOString()
                                    .slice(0, 10),
                                amount: entry.amount.toFixed(2),
                                accountWalletId: entry.accountWalletId,
                                categoryId: entry.categoryId,
                                version: payment.version,
                                idempotencyKey: payment.idempotencyKey,
                                spread: payment.expenseSpread
                                    ? {
                                          startMonth:
                                              payment.expenseSpread.startMonth,
                                          monthCount:
                                              payment.expenseSpread.monthCount,
                                      }
                                    : null,
                                skipped: true,
                            },
                        },
                    })
                    await tx.recurrenceOccurrence.update({
                        where: { id: upcoming.id },
                        data: { skippedAt: now },
                    })
                    await tx.transaction.delete({ where: { id: payment.id } })
                    await tx.recurrenceRule.update({
                        where: { id: ruleId },
                        data: { version: { increment: 1 } },
                    })
                    return
                }
                if (!rule.nextOccurrenceAt || rule.pausedAt)
                    throw new RecurrenceError(
                        "There is no active next occurrence to skip."
                    )
                await tx.recurrenceOccurrence.upsert({
                    where: {
                        ruleId_scheduledFor: {
                            ruleId,
                            scheduledFor: rule.nextOccurrenceAt,
                        },
                    },
                    create: {
                        ruleId,
                        scheduledFor: rule.nextOccurrenceAt,
                        skippedAt: now,
                    },
                    update: { skippedAt: now },
                })
                const next = nextSlot(
                    rule.startsAt.toISOString().slice(0, 10),
                    ruleInput(rule),
                    rule.nextIndex + 1
                )
                await tx.recurrenceRule.update({
                    where: { id: ruleId },
                    data: {
                        nextIndex: { increment: 1 },
                        nextOccurrenceAt: next
                            ? new Date(`${next}T00:00:00Z`)
                            : null,
                        version: { increment: 1 },
                    },
                })
            } else
                await tx.recurrenceRule.update({
                    where: { id: ruleId },
                    data: {
                        ...(command === "stop"
                            ? { stoppedAt: now, nextOccurrenceAt: null }
                            : { pausedAt: command === "pause" ? now : null }),
                        version: { increment: 1 },
                    },
                })
        },
        { timeout: 15_000 }
    )
}
export { localToday }
