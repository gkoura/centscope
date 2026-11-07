"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useState } from "react"
import Link from "@/components/i18n/link"
import {
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Wallet,
    Repeat2,
    CalendarRange,
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
    const locale = useLocale()

    const t = useTranslations()
    const displayName = (transaction: Transaction) =>
        transaction.type === "OPENING_BALANCE"
            ? t("Opening balance")
            : transaction.name

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
        new Intl.DateTimeFormat(intlLocale(locale), {
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
                                {rows.length === 1 ? t("entry") : t("entries")}
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
                                        className="transaction-entry relative border-b last:border-b-0"
                                    >
                                        <button
                                            type="button"
                                            className="transaction-open-button absolute inset-0 size-full"
                                            onClick={() =>
                                                setSelectedId(transaction.id)
                                            }
                                            aria-label={t(
                                                "View {value0}, {value1}, {value2}",
                                                {
                                                    value0: displayName(
                                                        transaction
                                                    ),
                                                    value1: t(
                                                        transaction.status ===
                                                            "POSTED"
                                                            ? "Posted"
                                                            : "Pending"
                                                    ),
                                                    value2: formatWalletMoney(
                                                        transaction.amount,
                                                        transaction.currency,
                                                        intlLocale(locale)
                                                    ),
                                                }
                                            )}
                                            aria-describedby={
                                                [
                                                    transaction.occurrence
                                                        ? `recurring-${transaction.id}`
                                                        : "",
                                                    transaction.expenseSpread
                                                        ? `spread-${transaction.id}`
                                                        : "",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ") || undefined
                                            }
                                        />
                                        <div className="transaction-row pointer-events-none relative">
                                            <span
                                                className="transaction-icon"
                                                data-flow={
                                                    transaction.type ===
                                                    "INCOME"
                                                        ? "income"
                                                        : transaction.type ===
                                                            "EXPENSE"
                                                          ? "expense"
                                                          : undefined
                                                }
                                            >
                                                <Icon
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <span className="min-w-0 flex-1 text-left">
                                                <span className="block truncate text-sm font-medium">
                                                    {displayName(transaction)}
                                                </span>
                                                <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                                                    {transaction.walletName}
                                                    {transaction.category
                                                        ? ` · ${transaction.category}`
                                                        : transaction.transfer
                                                          ? t(" · Transfer")
                                                          : t(
                                                                " · Opening balance"
                                                            )}
                                                </span>
                                            </span>
                                            <span className="max-w-[45%] min-w-0 shrink-0 text-right">
                                                <span
                                                    data-flow={
                                                        transaction.type ===
                                                        "INCOME"
                                                            ? "income"
                                                            : transaction.type ===
                                                                "EXPENSE"
                                                              ? "expense"
                                                              : undefined
                                                    }
                                                    className="block text-sm font-semibold wrap-break-word tabular-nums"
                                                >
                                                    {transaction.transfer
                                                        ?.direction ===
                                                    "INTERNAL"
                                                        ? t("Between wallets")
                                                        : `${transaction.type === "INCOME" ? "+" : ""}${formatWalletMoney(transaction.amount, transaction.currency, intlLocale(locale))}`}
                                                </span>
                                            </span>
                                            <ChevronRight
                                                className="size-3 shrink-0 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <div className="pointer-events-none relative flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 pb-2 sm:px-4">
                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                {transaction.occurrence && (
                                                    <Badge
                                                        id={`recurring-${transaction.id}`}
                                                        variant="secondary"
                                                        title={t(
                                                            "Part of a repeating transaction"
                                                        )}
                                                    >
                                                        <Repeat2
                                                            data-icon="inline-start"
                                                            aria-hidden="true"
                                                        />
                                                        {t("Recurring")}
                                                    </Badge>
                                                )}
                                                {transaction.expenseSpread && (
                                                    <Badge
                                                        id={`spread-${transaction.id}`}
                                                        variant="secondary"
                                                        title={t(
                                                            "Expense allocated across {value0} months",
                                                            {
                                                                value0: transaction
                                                                    .expenseSpread
                                                                    .monthCount,
                                                            }
                                                        )}
                                                    >
                                                        <CalendarRange
                                                            data-icon="inline-start"
                                                            aria-hidden="true"
                                                        />
                                                        {t("Spread ·")}{" "}
                                                        {
                                                            transaction
                                                                .expenseSpread
                                                                .monthCount
                                                        }{" "}
                                                        {t("mo")}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="pointer-events-auto relative ml-auto max-w-full">
                                                {transaction.canChangeStatus ? (
                                                    transaction.transfer ? (
                                                        <TransferStatusForm
                                                            compact
                                                            financialAccountId={
                                                                accountId
                                                            }
                                                            transaction={{
                                                                ...transaction,
                                                                transfer:
                                                                    transaction.transfer,
                                                            }}
                                                        />
                                                    ) : (
                                                        <TransactionStatusForm
                                                            compact
                                                            financialAccountId={
                                                                accountId
                                                            }
                                                            transactionId={
                                                                transaction.id
                                                            }
                                                            name={displayName(
                                                                transaction
                                                            )}
                                                            status={
                                                                transaction.status
                                                            }
                                                            version={
                                                                transaction.version
                                                            }
                                                        />
                                                    )
                                                ) : (
                                                    <span
                                                        className="inline-flex min-h-11 items-center text-xs text-muted-foreground"
                                                        title={t(
                                                            "This entry is read-only"
                                                        )}
                                                    >
                                                        {transaction.status ===
                                                        "POSTED"
                                                            ? t("Posted")
                                                            : t("Pending")}{" "}
                                                        {t("· Read-only")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
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
                                    {displayName(selected)}
                                </DialogTitle>
                                <DialogDescription>
                                    {dayLabel(selected.date)} ·{" "}
                                    {selected.walletName}
                                </DialogDescription>
                            </DialogHeader>
                            <p
                                data-flow={
                                    selected.type === "INCOME"
                                        ? "income"
                                        : selected.type === "EXPENSE"
                                          ? "expense"
                                          : undefined
                                }
                                className="text-3xl font-semibold tracking-tight wrap-break-word tabular-nums"
                            >
                                {selected.type === "INCOME" ? "+" : ""}
                                {formatWalletMoney(
                                    selected.amount,
                                    selected.currency,
                                    intlLocale(locale)
                                )}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {(selected.type === "INCOME" ||
                                    selected.type === "EXPENSE") && (
                                    <Badge
                                        variant="outline"
                                        data-flow={
                                            selected.type === "INCOME"
                                                ? "income"
                                                : "expense"
                                        }
                                    >
                                        {selected.type === "INCOME"
                                            ? t("Income")
                                            : t("Expense")}
                                    </Badge>
                                )}
                                {!selected.canChangeStatus && (
                                    <Badge
                                        variant={
                                            selected.status === "POSTED"
                                                ? "secondary"
                                                : "outline"
                                        }
                                    >
                                        {selected.status === "POSTED"
                                            ? t("Posted")
                                            : t("Pending")}
                                    </Badge>
                                )}
                                {selected.occurrence && (
                                    <Badge variant="outline">
                                        {t("Recurring")}
                                    </Badge>
                                )}
                                {selected.expenseSpread && (
                                    <Badge variant="outline">
                                        {t("Spread over")}{" "}
                                        {selected.expenseSpread.monthCount}{" "}
                                        {t("months")}
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
                                        {t("From")}{" "}
                                        {selected.transfer.source.accountName} ·{" "}
                                        {selected.transfer.source.walletName}
                                    </p>
                                    <p>
                                        {t("To")}{" "}
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
                                                      .currency,
                                                  intlLocale(locale)
                                              )
                                            : t("Other account")}{" "}
                                        →{" "}
                                        {selected.transfer.destination.available
                                            ? formatWalletMoney(
                                                  selected.transfer.destination
                                                      .amount,
                                                  selected.transfer.destination
                                                      .currency,
                                                  intlLocale(locale)
                                              )
                                            : t("Other account")}
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
                                                name={displayName(selected)}
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
                                                {t("Edit in wallet settings →")}
                                            </Link>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            "This entry is read-only because one of its wallets or accounts is no longer available."
                                        )}
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
