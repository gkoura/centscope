"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"

import { useTranslations } from "@/components/i18n/locale-provider"

import Link from "@/components/i18n/link"
import { useActionState, useEffect, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import {
    deleteTransaction,
    prepareRecurringDeletion,
} from "@/app/[locale]/dashboard/accounts/[id]/transactions/actions"
import type {
    DeleteScope,
    RecurringDeletionPreview,
} from "@/lib/transaction-deletion-input"
import type { TransactionFormState } from "@/lib/transaction-input"
import { formatWalletMoney } from "@/lib/wallet-input"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog"

const initialState: TransactionFormState = {}
export function TransactionActions({
    financialAccountId,
    transaction,
    returnTo,
    onEdit,
}: {
    onEdit?: () => void
    returnTo?: string
    financialAccountId: string
    transaction: {
        id: string
        name: string
        version: number
        status: "POSTED" | "PENDING"
        type: string
        amount: string
        currency: string
        occurrence?: { ruleId: string } | null
        walletName: string
    }
}) {
    const locale = useLocale()

    const t = useTranslations()

    const [state, action, pending] = useActionState(
        deleteTransaction,
        initialState
    )
    const [open, setOpen] = useState(false),
        [scope, setScope] = useState<DeleteScope>("ONLY")
    const [confirmation, setConfirmation] = useState<{
        preview?: RecurringDeletionPreview
        message?: string
        loading: boolean
    }>({ loading: false })
    const recurring = Boolean(transaction.occurrence)
    const linked = recurring || transaction.type === "TRANSFER"
    useEffect(() => {
        if (!open || !linked) return
        let cancelled = false
        void prepareRecurringDeletion({
            financialAccountId,
            transactionId: transaction.id,
            expectedVersion: transaction.version,
            scope,
        })
            .then((result) => {
                if (!cancelled) setConfirmation({ ...result, loading: false })
            })
            .catch(() => {
                if (!cancelled)
                    setConfirmation({
                        message: t(
                            "Couldn’t load the preview. Close and reopen to retry."
                        ),
                        loading: false,
                    })
            })
        return () => {
            cancelled = true
        }
    }, [
        open,
        linked,
        scope,
        t,
        financialAccountId,
        transaction.id,
        transaction.version,
    ])
    const changeScope = (value: DeleteScope) => {
        setScope(value)
        setConfirmation({ loading: true })
    }
    const amount = formatWalletMoney(
        transaction.amount.replace(/^-/, ""),
        transaction.currency,
        intlLocale(locale)
    )
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                render={
                    <Link
                        onClick={onEdit}
                        href={`/dashboard/accounts/${financialAccountId}/transactions/${transaction.id}/edit${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
                    />
                }
                nativeButton={false}
                disabled={pending}
                aria-label={t("Edit {value0}", { value0: transaction.name })}
            >
                <Pencil data-icon="inline-start" />
                {t("Edit")}
            </Button>
            <AlertDialog
                open={open}
                onOpenChange={(nextOpen, details) => {
                    if (pending) {
                        details.cancel()
                        return
                    }
                    if (nextOpen) {
                        setScope("ONLY")
                        setConfirmation({ loading: linked })
                    }
                    setOpen(nextOpen)
                }}
            >
                <AlertDialogTrigger
                    render={<Button variant="outline" size="sm" />}
                    aria-label={t("Delete {value0}", {
                        value0: transaction.name,
                    })}
                    disabled={pending}
                >
                    <Trash2 data-icon="inline-start" />
                    {t("Delete")}
                </AlertDialogTrigger>
                <AlertDialogContent className="max-h-[85svh] overflow-y-auto">
                    <form action={action} className="flex flex-col gap-4">
                        <input
                            type="hidden"
                            name="financialAccountId"
                            value={financialAccountId}
                        />
                        <input
                            type="hidden"
                            name="transactionId"
                            value={transaction.id}
                        />
                        <input
                            type="hidden"
                            name="expectedVersion"
                            value={transaction.version}
                        />
                        <input type="hidden" name="deleteScope" value={scope} />
                        {linked && confirmation.preview && (
                            <input
                                type="hidden"
                                name="deleteSnapshot"
                                value={confirmation.preview.snapshot}
                            />
                        )}
                        <AlertDialogHeader>
                            <AlertDialogTitle className="break-words">
                                {t("Delete")} {transaction.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="break-words">
                                {recurring
                                    ? t(
                                          "Choose which occurrences to delete. Deleted copies stay excluded and will not be recreated."
                                      )
                                    : transaction.type === "TRANSFER"
                                      ? t(
                                            "Deleting this transfer removes both wallet movements together."
                                        )
                                      : transaction.status === "PENDING"
                                        ? t(
                                              "This pending transaction has no effect on your balance."
                                          )
                                        : t(
                                              transaction.type === "EXPENSE"
                                                  ? "Deleting this expense adds {amount} back to {wallet}."
                                                  : "Deleting this income removes {amount} from {wallet}.",
                                              {
                                                  amount,
                                                  wallet: transaction.walletName,
                                              }
                                          )}{" "}
                                {t(
                                    "This cannot be undone. A record of each deletion is kept in your audit history."
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        {linked && (
                            <>
                                {recurring && (
                                    <Field>
                                        <FieldLabel
                                            htmlFor={`delete-scope-${transaction.id}`}
                                        >
                                            {t("Delete occurrences")}
                                        </FieldLabel>
                                        <select
                                            id={`delete-scope-${transaction.id}`}
                                            value={scope}
                                            onChange={(event) =>
                                                changeScope(
                                                    event.target
                                                        .value as DeleteScope
                                                )
                                            }
                                            disabled={pending}
                                            className="h-9 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                                        >
                                            <option value="ONLY">
                                                {t("Only this occurrence")}
                                            </option>
                                            <option value="FUTURE">
                                                {t(
                                                    "This and future occurrences"
                                                )}
                                            </option>
                                            <option value="ALL">
                                                {t(
                                                    "All occurrences, including past"
                                                )}
                                            </option>
                                        </select>
                                    </Field>
                                )}
                                {confirmation.loading && (
                                    <p
                                        role="status"
                                        className="text-sm text-muted-foreground"
                                    >
                                        {t("Loading affected transactions…")}
                                    </p>
                                )}
                                {confirmation.message && (
                                    <FieldError role="alert">
                                        {t(confirmation.message)}
                                    </FieldError>
                                )}
                                {confirmation.preview && (
                                    <div className="flex flex-col gap-2 text-sm">
                                        <p>
                                            {confirmation.preview.count}{" "}
                                            {t("transaction")}
                                            {confirmation.preview.count === 1
                                                ? ""
                                                : "s"}
                                            : {confirmation.preview.postedCount}{" "}
                                            {t("Posted ·")}{" "}
                                            {confirmation.preview.pendingCount}{" "}
                                            {t("Pending.")}
                                        </p>
                                        <p className="text-muted-foreground">
                                            {!recurring
                                                ? t(
                                                      "Both wallet movements will be removed together."
                                                  )
                                                : scope === "ONLY"
                                                  ? t(
                                                        "Other occurrences remain, and the series keeps its current settings."
                                                    )
                                                  : scope === "FUTURE"
                                                    ? t(
                                                          "Deletes occurrences scheduled from {value0} onward and stops further creation. Earlier occurrences remain.",
                                                          {
                                                              value0: confirmation
                                                                  .preview
                                                                  .scheduledFor,
                                                          }
                                                      )
                                                    : t(
                                                          "Deletes past and future occurrences and stops the series. Historical balances and reports may change."
                                                      )}
                                        </p>
                                        {confirmation.preview.balanceChanges
                                            .length ? (
                                            <ul className="flex flex-col gap-1">
                                                {confirmation.preview.balanceChanges.map(
                                                    (change, index) => (
                                                        <li
                                                            key={index}
                                                            className="break-words"
                                                        >
                                                            {change.account
                                                                ? `${change.account} · `
                                                                : ""}
                                                            {change.wallet}
                                                            {t(
                                                                ": posted balance changes by"
                                                            )}{" "}
                                                            {change.amount.startsWith(
                                                                "-"
                                                            )
                                                                ? ""
                                                                : "+"}
                                                            {formatWalletMoney(
                                                                change.amount,
                                                                change.currency,
                                                                intlLocale(
                                                                    locale
                                                                )
                                                            )}
                                                            .
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        ) : (
                                            <p>
                                                {t(
                                                    "No posted balance changes."
                                                )}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                        {state.message && (
                            <FieldError role="alert">
                                {t(state.message || "")}
                            </FieldError>
                        )}
                        <AlertDialogFooter>
                            <AlertDialogCancel type="button" disabled={pending}>
                                {t("Cancel")}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                type="submit"
                                variant="destructive"
                                disabled={
                                    pending ||
                                    (linked &&
                                        (confirmation.loading ||
                                            !confirmation.preview))
                                }
                            >
                                {pending
                                    ? t("Deleting…")
                                    : recurring && scope !== "ONLY"
                                      ? t("Delete selected occurrences")
                                      : t("Delete transaction")}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </form>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
