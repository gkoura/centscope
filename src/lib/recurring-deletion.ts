import "server-only"
import {
    accessibleAccount,
    lockFinancialAccess,
    sharedAuditContext,
} from "@/lib/financial-access"
import { createHash } from "node:crypto"
import { Prisma } from "@/generated/prisma/client"
import {
    movementInclude,
    checkMovements,
    transferLegs,
    movementSnapshot,
} from "@/lib/transfer-core"
import { prisma } from "@/lib/prisma"
import { requireVerifiedSession } from "@/lib/auth/session"
import { RecurrenceError } from "@/lib/recurrence-engine"
import type {
    TransactionDeletionReference,
    RecurringDeletionPreview,
} from "@/lib/transaction-deletion-input"

async function loadSelection(
    tx: Prisma.TransactionClient,
    input: TransactionDeletionReference,
    userId: string
) {
    const selected = await tx.transaction.findFirst({
        where: {
            id: input.transactionId,
            type: { in: ["EXPENSE", "INCOME", "TRANSFER"] },
            entries: { some: { financialAccountId: input.financialAccountId } },
        },
        include: { occurrence: { include: { rule: true } } },
    })
    const occurrence = selected?.occurrence,
        rule = occurrence?.rule
    if (
        !selected ||
        (!occurrence &&
            (selected.type !== "TRANSFER" || input.scope !== "ONLY")) ||
        selected.version !== input.expectedVersion
    )
        throw new RecurrenceError(
            "This transaction changed or is unavailable. Refresh before deleting."
        )
    const rows = await tx.transaction.findMany({
        where:
            input.scope === "ONLY"
                ? { id: selected.id }
                : {
                      occurrence: {
                          ruleId: rule!.id,
                          ...(input.scope === "FUTURE"
                              ? {
                                    scheduledFor: {
                                        gte: occurrence!.scheduledFor,
                                    },
                                }
                              : {}),
                      },
                  },
        include: {
            occurrence: true,
            expenseSpread: true,
            entries: { include: movementInclude, orderBy: { id: "asc" } },
            changes: {
                where: { action: "CREATED" },
                take: 1,
                select: { snapshot: true },
            },
        },
        orderBy: { id: "asc" },
    })
    if (!rows.length)
        throw new RecurrenceError("No affected transactions are available.")
    for (const row of rows) {
        if (
            row.entries.some(
                (e) => e.financialAccountId !== input.financialAccountId
            )
        )
            throw new RecurrenceError("An affected transaction is unavailable.")
        checkMovements(row.entries, userId)
        if (row.type === "TRANSFER") transferLegs(row.entries)
        else if (
            !["EXPENSE", "INCOME"].includes(row.type) ||
            row.entries.length !== 1 ||
            row.entries[0].financialAccountId !== input.financialAccountId
        )
            throw new RecurrenceError("An affected transaction is unavailable.")
    }
    const snapshot = createHash("sha256")
        .update(
            JSON.stringify({
                input,
                ruleId: rule?.id ?? null,
                ruleVersion: rule?.version ?? null,
                rows: rows.map((row) => ({
                    id: row.id,
                    version: row.version,
                    status: row.status,
                    date: row.occurredAt.toISOString(),
                    slot: row.occurrence?.scheduledFor.toISOString(),
                    entries: row.entries.map((entry) => ({
                        id: entry.id,
                        amount: entry.amount.toString(),
                        categoryId: entry.categoryId,
                        allocation: entry.accountWalletId,
                        wallet: entry.accountWallet.wallet.name,
                    })),
                })),
            })
        )
        .digest("hex")
    return { rows, rule, occurrence, snapshot }
}
export async function previewOwnedRecurringDeletion(
    input: TransactionDeletionReference
): Promise<RecurringDeletionPreview> {
    const { user } = await requireVerifiedSession()
    return prisma.$transaction(
        async (tx) => {
            const account = await tx.financialAccount.findFirst({
                where: {
                    id: input.financialAccountId,
                    ...accessibleAccount(user.id),
                },
                select: { ownerId: true },
            })
            if (!account)
                throw new RecurrenceError("This account is unavailable.")
            const { rows, occurrence, snapshot } = await loadSelection(
                tx,
                input,
                account.ownerId
            )
            const totals = new Map<
                string,
                {
                    wallet: string
                    account: string
                    currency: string
                    amount: Prisma.Decimal
                }
            >()
            for (const row of rows) {
                if (row.status !== "POSTED") continue
                for (const e of row.entries) {
                    const w = e.accountWallet.wallet,
                        key = e.accountWalletId
                    const previous = totals.get(key)
                    totals.set(key, {
                        wallet: w.name,
                        account: e.accountWallet.financialAccount.name,
                        currency: w.currency,
                        amount: (previous?.amount ?? new Prisma.Decimal(0)).sub(
                            e.amount
                        ),
                    })
                }
            }
            return {
                snapshot,
                count: rows.length,
                postedCount: rows.filter((row) => row.status === "POSTED")
                    .length,
                pendingCount: rows.filter((row) => row.status === "PENDING")
                    .length,
                scheduledFor: (occurrence?.scheduledFor ?? rows[0].occurredAt)
                    .toISOString()
                    .slice(0, 10),
                balanceChanges: [...totals.values()].map((row) => ({
                    ...row,
                    amount: row.amount.toFixed(2),
                })),
            }
        },
        { isolationLevel: "RepeatableRead", timeout: 15_000 }
    )
}
export async function deleteRecurringSelection(
    tx: Prisma.TransactionClient,
    input: TransactionDeletionReference & { expectedSnapshot: string },
    userId: string
) {
    // The caller holds the account lock, matching every generation/edit/delete writer.
    const retry = await tx.transactionChange.findFirst({
        where: {
            actorId: userId,
            action: "DELETED",
            AND: [
                {
                    snapshot: {
                        path: ["deleteAnchorId"],
                        equals: input.transactionId,
                    },
                },
                {
                    snapshot: {
                        path: ["deleteSnapshot"],
                        equals: input.expectedSnapshot,
                    },
                },
                { snapshot: { path: ["deleteScope"], equals: input.scope } },
                {
                    OR: [
                        {
                            snapshot: {
                                path: ["financialAccountId"],
                                equals: input.financialAccountId,
                            },
                        },
                        {
                            snapshot: {
                                path: ["financialAccountIds"],
                                array_contains: [input.financialAccountId],
                            },
                        },
                    ],
                },
                {
                    snapshot: {
                        path: ["deleteAnchorVersion"],
                        equals: input.expectedVersion,
                    },
                },
            ],
        },
        select: { id: true },
    })
    if (retry) return
    // Don't include the confirmation token itself when recreating the fingerprint.
    const reference = {
        financialAccountId: input.financialAccountId,
        transactionId: input.transactionId,
        expectedVersion: input.expectedVersion,
        scope: input.scope,
    }
    const ownerId = await lockFinancialAccess(
        tx,
        input.financialAccountId,
        userId
    )
    const { rows, rule, snapshot } = await loadSelection(tx, reference, ownerId)
    if (snapshot !== input.expectedSnapshot)
        throw new RecurrenceError(
            "The series changed after the preview. Close and reopen the confirmation. Nothing was deleted."
        )
    const ids = rows.map((row) => row.id)
    const audits = rows.map((row) => {
        const e = row.entries[0],
            original = row.changes[0]?.snapshot
        const fingerprint =
            original &&
            typeof original === "object" &&
            !Array.isArray(original) &&
            typeof original.requestFingerprint === "string"
                ? original.requestFingerprint
                : null
        return {
            transactionId: row.id,
            liveTransactionId: row.id,
            actorId: userId,
            action: "DELETED",
            snapshot: {
                ...sharedAuditContext(
                    ownerId,
                    userId,
                    input.financialAccountId
                ),
                financialAccountId: input.financialAccountId,
                createdById: row.createdById,
                idempotencyKey: row.idempotencyKey,
                requestFingerprint: fingerprint,
                ruleId: rule?.id ?? null,
                financialAccountIds: row.entries.map(
                    (e) => e.financialAccountId
                ),
                entries: row.entries.map(movementSnapshot),
                scheduledFor:
                    row.occurrence?.scheduledFor.toISOString() ??
                    row.occurredAt.toISOString(),
                deleteScope: input.scope,
                deleteSnapshot: snapshot,
                deleteAnchorId: input.transactionId,
                deleteAnchorVersion: input.expectedVersion,
                name: row.name,
                type: row.type,
                status: row.status,
                date: row.occurredAt.toISOString().slice(0, 10),
                version: row.version,
                notes: row.notes,
                amount: e.amount.toFixed(2),
                currency: e.accountWallet.wallet.currency,
                accountWalletId: e.accountWalletId,
                walletName: e.accountWallet.wallet.name,
                categoryId: e.categoryId,
                categoryName: e.category?.name ?? null,
                parentCategoryName: e.category?.parent?.name ?? null,
                spread: row.expenseSpread
                    ? {
                          startMonth: row.expenseSpread.startMonth,
                          monthCount: row.expenseSpread.monthCount,
                      }
                    : null,
            },
        }
    })
    for (let start = 0; start < audits.length; start += 500)
        await tx.transactionChange.createMany({
            data: audits.slice(start, start + 500),
        })
    await tx.recurrenceOccurrence.updateMany({
        where: { transactionId: { in: ids } },
        data: { skippedAt: new Date() },
    })
    const removed = await tx.transaction.deleteMany({
        where: { id: { in: ids } },
    })
    if (removed.count !== ids.length)
        throw new RecurrenceError(
            "The affected transactions changed. Nothing was deleted; reload the confirmation."
        )
    if (rule)
        await tx.recurrenceRule.update({
            where: { id: rule!.id },
            data: {
                version: { increment: 1 },
                ...(input.scope !== "ONLY"
                    ? { stoppedAt: new Date(), nextOccurrenceAt: null }
                    : {}),
            },
        })
}
