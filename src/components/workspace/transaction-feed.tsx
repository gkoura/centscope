"use client"
import { useState } from "react"
import Link from "next/link"
import {
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Wallet,
    Repeat2,
    ChevronRight,
} from "lucide-react"
import type { listOwnedAccountTransactions } from "@/lib/transactions"
import { formatWalletMoney } from "@/lib/wallet-input"
import { TransactionActions } from "@/components/financial-accounts/transaction-actions"
import { TransactionStatusForm } from "@/components/financial-accounts/transaction-status-form"
import { TransferStatusForm } from "@/components/financial-accounts/transfer-status-form"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

type Transaction = Awaited<
    ReturnType<typeof listOwnedAccountTransactions>
>["transactions"][number]
export function TransactionFeed({
    accountId,
    transactions,
    returnTo,
}: {
    accountId: string
    transactions: Transaction[]
    returnTo: string
}) {
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const selected = transactions.find(
        (transaction) => transaction.id === selectedId
    )
    const days = new Map<string, Transaction[]>()
    for (const transaction of transactions) {
        const rows = days.get(transaction.date) ?? []
        rows.push(transaction)
        days.set(transaction.date, rows)
    }
    const dayLabel = (date: string) =>
        new Intl.DateTimeFormat("en", {
            weekday: "long",
            day: "numeric",
            month: "short",
            timeZone: "UTC",
        }).format(new Date(`${date}T00:00:00Z`))
    return (
        <>
            <div className="flex flex-col gap-6">
                {[...days].map(([date, rows]) => (
                    <section
                        key={date}
                        className="transaction-day"
                        aria-label={dayLabel(date)}
                    >
                        <div className="mb-2 flex items-center justify-between px-1">
                            <h3 className="text-xs font-medium text-muted-foreground">
                                <time dateTime={date}>{dayLabel(date)}</time>
                            </h3>
                            <span className="text-[10px] text-muted-foreground">
                                {rows.length}{" "}
                                {rows.length === 1 ? "entry" : "entries"}
                            </span>
                        </div>
                        <ul className="overflow-hidden rounded-2xl border bg-card">
                            {rows.map((transaction) => {
                                const Icon =
                                    transaction.type === "TRANSFER"
                                        ? ArrowLeftRight
                                        : transaction.type === "INCOME"
                                          ? ArrowDownLeft
                                          : transaction.type === "EXPENSE"
                                            ? ArrowUpRight
                                            : Wallet
                                return (
                                    <li
                                        key={transaction.id}
                                        className="border-b last:border-b-0"
                                    >
                                        <button
                                            type="button"
                                            className="transaction-row"
                                            onClick={() =>
                                                setSelectedId(transaction.id)
                                            }
                                            aria-label={`View ${transaction.name}, ${transaction.status.toLowerCase()}, ${formatWalletMoney(transaction.amount, transaction.currency)}`}
                                        >
                                            <span className="transaction-icon">
                                                <Icon
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <span className="min-w-0 flex-1 text-left">
                                                <span className="block truncate text-sm font-medium">
                                                    {transaction.name}
                                                </span>
                                                <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                                                    {transaction.walletName}
                                                    {transaction.category
                                                        ? ` · ${transaction.category}`
                                                        : transaction.transfer
                                                          ? " · Transfer"
                                                          : " · Opening balance"}
                                                </span>
                                            </span>
                                            <span className="max-w-[45%] min-w-0 shrink-0 text-right">
                                                <span className="block text-sm font-semibold wrap-break-word tabular-nums">
                                                    {transaction.transfer
                                                        ?.direction ===
                                                    "INTERNAL"
                                                        ? "Between wallets"
                                                        : `${transaction.type === "INCOME" ? "+" : ""}${formatWalletMoney(transaction.amount, transaction.currency)}`}
                                                </span>
                                                <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                                                    {transaction.occurrence && (
                                                        <Repeat2
                                                            className="size-3"
                                                            aria-label="Recurring"
                                                        />
                                                    )}
                                                    {transaction.status ===
                                                    "PENDING"
                                                        ? "Pending"
                                                        : transaction.expenseSpread
                                                          ? `Spread · ${transaction.expenseSpread.monthCount} months`
                                                          : "Posted"}
                                                </span>
                                            </span>
                                            <ChevronRight
                                                className="size-3 shrink-0 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    </section>
                ))}
            </div>
            <Dialog
                open={Boolean(selected)}
                onOpenChange={(open) => {
                    if (!open) setSelectedId(null)
                }}
            >
                <DialogContent className="max-h-[85dvh] overflow-y-auto">
                    {selected && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="pr-6 leading-6 wrap-break-word">
                                    {selected.name}
                                </DialogTitle>
                                <DialogDescription>
                                    {dayLabel(selected.date)} ·{" "}
                                    {selected.walletName}
                                </DialogDescription>
                            </DialogHeader>
                            <p className="text-3xl font-semibold tracking-tight wrap-break-word tabular-nums">
                                {formatWalletMoney(
                                    selected.amount,
                                    selected.currency
                                )}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Badge
                                    variant={
                                        selected.status === "POSTED"
                                            ? "secondary"
                                            : "outline"
                                    }
                                >
                                    {selected.status === "POSTED"
                                        ? "Posted"
                                        : "Pending"}
                                </Badge>
                                {selected.occurrence && (
                                    <Badge variant="outline">Recurring</Badge>
                                )}
                                {selected.expenseSpread && (
                                    <Badge variant="outline">
                                        Spread over{" "}
                                        {selected.expenseSpread.monthCount}{" "}
                                        months
                                    </Badge>
                                )}
                            </div>
                            {selected.category && (
                                <p className="text-sm text-muted-foreground">
                                    {selected.category}
                                </p>
                            )}
                            {selected.transfer && (
                                <div className="rounded-xl bg-muted p-4 text-sm leading-7">
                                    <p>
                                        From{" "}
                                        {selected.transfer.source.accountName} ·{" "}
                                        {selected.transfer.source.walletName}
                                    </p>
                                    <p>
                                        To{" "}
                                        {
                                            selected.transfer.destination
                                                .accountName
                                        }{" "}
                                        ·{" "}
                                        {
                                            selected.transfer.destination
                                                .walletName
                                        }
                                    </p>
                                    <p className="font-medium">
                                        {selected.transfer.source.available
                                            ? formatWalletMoney(
                                                  selected.transfer.source
                                                      .amount,
                                                  selected.transfer.source
                                                      .currency
                                              )
                                            : "Other account"}{" "}
                                        →{" "}
                                        {selected.transfer.destination.available
                                            ? formatWalletMoney(
                                                  selected.transfer.destination
                                                      .amount,
                                                  selected.transfer.destination
                                                      .currency
                                              )
                                            : "Other account"}
                                    </p>
                                </div>
                            )}
                            {selected.notes && (
                                <p className="text-sm leading-7 wrap-break-word whitespace-pre-wrap">
                                    {selected.notes}
                                </p>
                            )}
                            <div className="mt-2 flex flex-col items-start gap-4 border-t pt-5">
                                {selected.canChangeStatus ? (
                                    <>
                                        {selected.transfer ? (
                                            <TransferStatusForm
                                                key={`${selected.id}:${selected.version}`}
                                                financialAccountId={accountId}
                                                transaction={{
                                                    ...selected,
                                                    transfer: selected.transfer,
                                                }}
                                            />
                                        ) : (
                                            <TransactionStatusForm
                                                key={`${selected.id}:${selected.version}`}
                                                financialAccountId={accountId}
                                                transactionId={selected.id}
                                                name={selected.name}
                                                status={selected.status}
                                                version={selected.version}
                                            />
                                        )}
                                        {[
                                            "EXPENSE",
                                            "INCOME",
                                            "TRANSFER",
                                        ].includes(selected.type) && (
                                            <TransactionActions
                                                key={`actions:${selected.id}:${selected.version}`}
                                                financialAccountId={accountId}
                                                transaction={selected}
                                                returnTo={returnTo}
                                                onEdit={() =>
                                                    setSelectedId(null)
                                                }
                                            />
                                        )}
                                        {selected.type ===
                                            "OPENING_BALANCE" && (
                                            <Link
                                                href={`/dashboard/accounts/${accountId}#wallet-settings`}
                                                className="text-sm text-primary"
                                            >
                                                Edit in wallet settings →
                                            </Link>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        This entry is read-only because one of
                                        its wallets or accounts is no longer
                                        available.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
