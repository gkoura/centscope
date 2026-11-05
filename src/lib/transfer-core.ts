import "server-only"
import { Prisma } from "@/generated/prisma/client"
export class TransferError extends Error {}
export const movementInclude = {
    accountWallet: { include: { wallet: true, financialAccount: true } },
    category: { include: { parent: true } },
} as const
export type Movement = Prisma.LedgerEntryGetPayload<{
    include: typeof movementInclude
}>
export function checkMovements(
    entries: Movement[],
    userId: string,
    active = true
) {
    if (
        entries.some(
            (e) =>
                e.accountWallet.wallet.ownerId !== userId ||
                e.accountWallet.financialAccount.ownerId !== userId ||
                (active &&
                    (e.accountWallet.archivedAt ||
                        e.accountWallet.wallet.archivedAt ||
                        e.accountWallet.financialAccount.archivedAt))
        )
    )
        throw new TransferError("An affected account or wallet is unavailable.")
}
export async function lockAccounts(
    tx: Prisma.TransactionClient,
    ids: string[],
    userId: string,
    active = true
) {
    const sorted = [...new Set(ids)].sort()
    if (!sorted.length) throw new TransferError("Choose available accounts.")
    const rows = await tx.$queryRaw<
        { id: string }[]
    >`SELECT id FROM financial_account WHERE id IN (${Prisma.join(sorted)}) AND "ownerId"=${userId} ${active ? Prisma.sql`AND "archivedAt" IS NULL` : Prisma.empty} ORDER BY id FOR UPDATE`
    if (rows.length !== sorted.length)
        throw new TransferError("An affected account is unavailable.")
}
export async function lockAllocations(
    tx: Prisma.TransactionClient,
    ids: string[]
) {
    const sorted = [...new Set(ids)].sort()
    if (!sorted.length) return
    const wallets = await tx.accountWallet.findMany({
        where: { id: { in: sorted } },
        select: { walletId: true },
    })
    const walletIds = [...new Set(wallets.map((w) => w.walletId))].sort()
    if (walletIds.length)
        await tx.$queryRaw`SELECT id FROM wallet WHERE id IN (${Prisma.join(walletIds)}) ORDER BY id FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM account_wallet WHERE id IN (${Prisma.join(sorted)}) ORDER BY id FOR UPDATE`
}
export function transferLegs(entries: Movement[]) {
    const source = entries.find((e) => e.amount.isNegative()),
        destination = entries.find((e) => e.amount.isPositive())
    if (
        entries.length !== 2 ||
        !source ||
        !destination ||
        source.accountWalletId === destination.accountWalletId ||
        entries.some((e) => e.categoryId) ||
        (source.accountWallet.wallet.currency ===
            destination.accountWallet.wallet.currency &&
            !source.amount.add(destination.amount).isZero())
    )
        throw new TransferError(
            "This transfer has an unsupported ledger shape."
        )
    return { source, destination }
}
export function movementSnapshot(e: Movement) {
    return {
        accountWalletId: e.accountWalletId,
        financialAccountId: e.financialAccountId,
        accountName: e.accountWallet.financialAccount.name,
        walletId: e.accountWallet.walletId,
        walletName: e.accountWallet.wallet.name,
        currency: e.accountWallet.wallet.currency,
        amount: e.amount.toFixed(2),
        categoryId: e.categoryId,
    }
}
export function transferSnapshot(row: {
    name: string
    type: string
    status: string
    notes: string | null
    occurredAt: Date
    version: number
    entries: Movement[]
}) {
    return {
        name: row.name,
        type: row.type,
        status: row.status,
        notes: row.notes,
        date: row.occurredAt.toISOString().slice(0, 10),
        version: row.version,
        entries: row.entries.map(movementSnapshot),
        financialAccountIds: [
            ...new Set(row.entries.map((e) => e.financialAccountId)),
        ].sort(),
    }
}
export async function transferEndpoints(
    tx: Prisma.TransactionClient,
    sourceId: string,
    destinationId: string,
    userId: string,
    amount: string,
    received: string | null,
    financialAccountId: string
) {
    const rows = await tx.accountWallet.findMany({
        where: { id: { in: [sourceId, destinationId] } },
        include: { wallet: true, financialAccount: true },
    })
    const source = rows.find((r) => r.id === sourceId),
        destination = rows.find((r) => r.id === destinationId)
    if (
        !source ||
        !destination ||
        source.id === destination.id ||
        rows.some(
            (r) =>
                r.archivedAt ||
                r.wallet.archivedAt ||
                r.financialAccount.archivedAt ||
                r.wallet.ownerId !== userId ||
                r.financialAccount.ownerId !== userId
        )
    )
        throw new TransferError(
            "Choose two different active owned wallet allocations."
        )
    if (
        source.financialAccountId !== financialAccountId ||
        destination.financialAccountId !== financialAccountId
    )
        throw new TransferError(
            "Transfers are only available between wallets in the same account."
        )
    const same = source.wallet.currency === destination.wallet.currency
    if (!same && !received)
        throw new TransferError(
            "Enter the amount received in the destination currency."
        )
    if (same && received && !new Prisma.Decimal(received).equals(amount))
        throw new TransferError("Same-currency transfer amounts must match.")
    return { source, destination, received: same ? amount : received! }
}
