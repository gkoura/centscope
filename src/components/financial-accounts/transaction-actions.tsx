"use client"
import { NativeSelect } from "@/components/ui/native-select"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import {
    deleteTransaction,
    prepareRecurringDeletion,
} from "@/app/dashboard/accounts/[id]/transactions/actions"
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
                        message:
                            "Couldn’t load the preview. Close and reopen to retry.",
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
        transaction.currency
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
                aria-label={`Edit ${transaction.name}`}
            >
                <Pencil data-icon="inline-start" />
                Edit
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
                    aria-label={`Delete ${transaction.name}`}
                    disabled={pending}
                >
                    <Trash2 data-icon="inline-start" />
                    Delete
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
                                Delete {transaction.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="break-words">
                                {recurring
                                    ? "Choose which occurrences to delete. Deleted copies stay excluded and will not be recreated."
                                    : transaction.type === "TRANSFER"
                                      ? "Deleting this transfer removes both wallet movements together."
                                      : transaction.status === "PENDING"
                                        ? "This pending transaction has no effect on your balance."
                                        : `Deleting this ${transaction.type === "EXPENSE" ? "expense adds" : "income removes"} ${amount} ${transaction.type === "EXPENSE" ? "back to" : "from"} ${transaction.walletName}.`}{" "}
                                This cannot be undone. A record of each deletion
                                is kept in your audit history.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        {linked && (
                            <>
                                {recurring && (
                                    <Field>
                                        <FieldLabel
                                            htmlFor={`delete-scope-${transaction.id}`}
                                        >
                                            Delete occurrences
                                        </FieldLabel>
                                        <NativeSelect
                                            id={`delete-scope-${transaction.id}`}
                                            value={scope}
                                            onChange={(event) =>
                                                changeScope(
                                                    event.target
                                                        .value as DeleteScope
                                                )
                                            }
                                            disabled={pending}
                                            className="w-full [&>select]:h-11"
                                        >
                                            <option value="ONLY">
                                                Only this occurrence
                                            </option>
                                            <option value="FUTURE">
                                                This and future occurrences
                                            </option>
                                            <option value="ALL">
                                                All occurrences, including past
                                            </option>
                                        </NativeSelect>
                                    </Field>
                                )}
                                {confirmation.loading && (
                                    <p
                                        role="status"
                                        className="text-sm text-muted-foreground"
                                    >
                                        Loading affected transactions…
                                    </p>
                                )}
                                {confirmation.message && (
                                    <FieldError role="alert">
                                        {confirmation.message}
                                    </FieldError>
                                )}
                                {confirmation.preview && (
                                    <div className="flex flex-col gap-2 text-sm">
                                        <p>
                                            {confirmation.preview.count}{" "}
                                            transaction
                                            {confirmation.preview.count === 1
                                                ? ""
                                                : "s"}
                                            : {confirmation.preview.postedCount}{" "}
                                            Posted ·{" "}
                                            {confirmation.preview.pendingCount}{" "}
                                            Pending.
                                        </p>
                                        <p className="text-muted-foreground">
                                            {!recurring
                                                ? "Both wallet movements will be removed together."
                                                : scope === "ONLY"
                                                  ? "Other occurrences remain, and the series keeps its current settings."
                                                  : scope === "FUTURE"
                                                    ? `Deletes occurrences scheduled from ${confirmation.preview.scheduledFor} onward and stops further creation. Earlier occurrences remain.`
                                                    : "Deletes past and future occurrences and stops the series. Historical balances and reports may change."}
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
                                                            {change.wallet}:
                                                            posted balance
                                                            changes by{" "}
                                                            {change.amount.startsWith(
                                                                "-"
                                                            )
                                                                ? ""
                                                                : "+"}
                                                            {formatWalletMoney(
                                                                change.amount,
                                                                change.currency
                                                            )}
                                                            .
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        ) : (
                                            <p>No posted balance changes.</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                        {state.message && (
                            <FieldError role="alert">
                                {state.message}
                            </FieldError>
                        )}
                        <AlertDialogFooter>
                            <AlertDialogCancel type="button" disabled={pending}>
                                Cancel
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
                                    ? "Deleting…"
                                    : recurring && scope !== "ONLY"
                                      ? "Delete selected occurrences"
                                      : "Delete transaction"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </form>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
