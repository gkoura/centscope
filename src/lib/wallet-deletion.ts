import "server-only"
import { createHash, randomUUID } from "node:crypto"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireVerifiedSession } from "@/lib/auth/session"
import type {
    WalletDeletionInput,
    WalletDeletionReference,
    WalletDeletionPreview,
} from "@/lib/wallet-deletion-input"

export class WalletDeletionError extends Error {}
type Db = Pick<Prisma.TransactionClient, "accountWallet" | "transaction">
async function resolveScope(
    db: Db,
    input: WalletDeletionReference,
    userId: string
) {
    const allocation = await db.accountWallet.findFirst({
        where: {
            id: input.accountWalletId,
            financialAccountId: input.financialAccountId,
            financialAccount: { ownerId: userId, archivedAt: null },
            wallet: { ownerId: userId },
        },
        include: {
            wallet: {
                include: {
                    allocations: {
                        include: { financialAccount: true },
                        orderBy: { id: "asc" },
                    },
                },
            },
        },
    })
    if (!allocation)
        throw new WalletDeletionError("This wallet is unavailable.")
    if (
        allocation.wallet.allocations.some(
            (item) => item.financialAccount.ownerId !== userId
        )
    )
        throw new WalletDeletionError(
            "This wallet is also used by an account you do not own. It cannot be deleted here."
        )
    return allocation
}
async function loadTransactions(db: Db, walletId: string, userId: string) {
    const total = await db.transaction.count({
        where: { entries: { some: { accountWallet: { walletId } } } },
    })
    const rows = await db.transaction.findMany({
        where: {
            type: { in: ["OPENING_BALANCE", "EXPENSE", "INCOME"] },
            entries: {
                some: { accountWallet: { walletId } },
                every: {
                    accountWallet: {
                        walletId,
                        wallet: { ownerId: userId },
                        financialAccount: { ownerId: userId },
                    },
                },
            },
        },
        include: {
            expenseSpread: true,
            entries: { include: { category: { include: { parent: true } } } },
            changes: {
                where: { action: "CREATED" },
                take: 1,
                select: { snapshot: true },
            },
        },
        orderBy: { id: "asc" },
    })
    if (rows.length !== total || rows.some((row) => row.entries.length !== 1))
        throw new WalletDeletionError(
            "This wallet has linked transactions or transfers that cannot be safely deleted here."
        )
    return rows
}
function fingerprint(
    scope: Awaited<ReturnType<typeof resolveScope>>,
    rows: Awaited<ReturnType<typeof loadTransactions>>
) {
    return createHash("sha256")
        .update(
            JSON.stringify({
                wallet: {
                    id: scope.wallet.id,
                    name: scope.wallet.name,
                    currency: scope.wallet.currency,
                    updatedAt: scope.wallet.updatedAt.toISOString(),
                    archivedAt: scope.wallet.archivedAt,
                },
                allocations: scope.wallet.allocations.map((item) => ({
                    id: item.id,
                    financialAccountId: item.financialAccountId,
                    ownerId: item.financialAccount.ownerId,
                    name: item.financialAccount.name,
                    archivedAt: item.archivedAt,
                    accountArchivedAt: item.financialAccount.archivedAt,
                })),
                transactions: rows.map((row) => ({
                    id: row.id,
                    version: row.version,
                    status: row.status,
                    date: row.occurredAt.toISOString(),
                    entries: row.entries.map((entry) => ({
                        id: entry.id,
                        allocation: entry.accountWalletId,
                        amount: entry.amount.toFixed(2),
                        categoryId: entry.categoryId,
                    })),
                })),
            })
        )
        .digest("hex")
}

export async function getOwnedWalletDeletionPreview(
    input: WalletDeletionReference
): Promise<WalletDeletionPreview> {
    const { user } = await requireVerifiedSession()
    return prisma.$transaction(
        async (tx) => {
            const scope = await resolveScope(tx, input, user.id)
            if (scope.archivedAt || scope.wallet.archivedAt)
                throw new WalletDeletionError("This wallet is unavailable.")
            const transactions = await loadTransactions(
                tx,
                scope.wallet.id,
                user.id
            )
            return {
                name: scope.wallet.name,
                accounts: scope.wallet.allocations.map((item) => ({
                    id: item.financialAccountId,
                    name: item.financialAccount.name,
                    archived: Boolean(item.financialAccount.archivedAt),
                })),
                transactionCount: transactions.length,
                postedCount: transactions.filter(
                    (row) => row.status === "POSTED"
                ).length,
                pendingCount: transactions.filter(
                    (row) => row.status === "PENDING"
                ).length,
                openingCount: transactions.filter(
                    (row) => row.type === "OPENING_BALANCE"
                ).length,
                expectedSnapshot: fingerprint(scope, transactions),
            }
        },
        { isolationLevel: "RepeatableRead", timeout: 15_000 }
    )
}

export async function deleteOwnedWallet(input: WalletDeletionInput) {
    const { user } = await requireVerifiedSession()
    const initial = await resolveScope(prisma, input, user.id)
    const accountIds = initial.wallet.allocations
        .map((item) => item.financialAccountId)
        .sort()
    await prisma.$transaction(
        async (tx) => {
            // Match the account-before-wallet lock order used by financial mutations.
            const accounts = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM financial_account WHERE id IN (${Prisma.join(accountIds)}) AND "ownerId" = ${user.id} ORDER BY id FOR UPDATE
        `
            if (accounts.length !== accountIds.length)
                throw new WalletDeletionError(
                    "An affected account changed. Close and reopen the confirmation."
                )
            await tx.$queryRaw`SELECT id FROM wallet WHERE id = ${initial.wallet.id} AND "ownerId" = ${user.id} FOR UPDATE`
            await tx.$queryRaw`SELECT id FROM account_wallet WHERE "walletId" = ${initial.wallet.id} ORDER BY id FOR UPDATE`
            const scope = await resolveScope(tx, input, user.id)
            const currentAccounts = scope.wallet.allocations
                .map((item) => item.financialAccountId)
                .sort()
            if (JSON.stringify(accountIds) !== JSON.stringify(currentAccounts))
                throw new WalletDeletionError(
                    "This wallet's accounts changed. Close and reopen the confirmation."
                )
            const transactions = await loadTransactions(
                tx,
                scope.wallet.id,
                user.id
            )
            if (scope.wallet.archivedAt) {
                if (
                    !transactions.length &&
                    scope.wallet.allocations.every((item) => item.archivedAt)
                )
                    return
                throw new WalletDeletionError("This wallet is unavailable.")
            }
            if (
                scope.archivedAt ||
                fingerprint(scope, transactions) !== input.expectedSnapshot
            )
                throw new WalletDeletionError(
                    "The wallet or its transactions changed. Close and reopen the confirmation before deleting."
                )
            const audits = transactions.map((transaction) => {
                const entry = transaction.entries[0],
                    original = transaction.changes[0]?.snapshot
                const requestFingerprint =
                    original &&
                    typeof original === "object" &&
                    !Array.isArray(original) &&
                    typeof original.requestFingerprint === "string"
                        ? original.requestFingerprint
                        : null
                return {
                    id: randomUUID(),
                    transactionId: transaction.id,
                    liveTransactionId: transaction.id,
                    actorId: user.id,
                    action: "DELETED",
                    snapshot: {
                        financialAccountId: entry.financialAccountId,
                        createdById: transaction.createdById,
                        idempotencyKey: transaction.idempotencyKey,
                        requestFingerprint,
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
                        currency: scope.wallet.currency,
                        accountWalletId: entry.accountWalletId,
                        walletId: scope.wallet.id,
                        walletName: scope.wallet.name,
                        categoryId: entry.categoryId,
                        categoryName: entry.category?.name ?? null,
                        parentCategoryName:
                            entry.category?.parent?.name ?? null,
                        walletDeleted: true,
                    },
                }
            })
            // Bulk writes keep even large wallet cascades in one atomic operation.
            for (let start = 0; start < audits.length; start += 500)
                await tx.transactionChange.createMany({
                    data: audits.slice(start, start + 500),
                })
            await tx.recurrenceOccurrence.updateMany({
                where: {
                    transactionId: { in: transactions.map((row) => row.id) },
                },
                data: { skippedAt: new Date() },
            })
            if (transactions.length) {
                const removed = await tx.transaction.deleteMany({
                    where: { id: { in: transactions.map((row) => row.id) } },
                })
                if (removed.count !== transactions.length)
                    throw new WalletDeletionError(
                        "The transactions changed. Nothing was deleted; reopen the confirmation."
                    )
            }
            await tx.recurrenceRule.updateMany({
                where: { source: { walletId: scope.wallet.id } },
                data: {
                    stoppedAt: new Date(),
                    nextOccurrenceAt: null,
                    version: { increment: 1 },
                },
            })
            const archivedAt = new Date()
            await tx.accountWallet.updateMany({
                where: { walletId: scope.wallet.id, archivedAt: null },
                data: { archivedAt },
            })
            // Retain internal deletion markers to preserve provenance and block stale
            // create/import/edit requests from resurrecting a deleted wallet.
            await tx.wallet.update({
                where: { id: scope.wallet.id },
                data: {
                    archivedAt,
                    updatedAt: new Date(
                        Math.max(
                            Date.now(),
                            scope.wallet.updatedAt.getTime() + 1
                        )
                    ),
                },
            })
        },
        { timeout: 30_000, maxWait: 10_000 }
    )
}
