"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { deleteTransaction } from "@/app/dashboard/accounts/[id]/transactions/actions"
import type { TransactionFormState } from "@/lib/transaction-input"
import { formatWalletMoney } from "@/lib/wallet-input"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
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
}: {
    financialAccountId: string
    transaction: {
        id: string
        name: string
        version: number
        status: "POSTED" | "PENDING"
        type: string
        amount: string
        currency: string
        walletName: string
    }
}) {
    const [state, action, pending] = useActionState(
        deleteTransaction,
        initialState
    )
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
                        href={`/dashboard/accounts/${financialAccountId}/transactions/${transaction.id}/edit`}
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
                onOpenChange={(_open, details) => {
                    if (pending) details.cancel()
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
                <AlertDialogContent>
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
                        <AlertDialogHeader>
                            <AlertDialogTitle className="break-words">
                                Delete {transaction.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="break-words">
                                {transaction.status === "PENDING"
                                    ? "This pending transaction has no effect on your balance."
                                    : `Deleting this ${transaction.type === "EXPENSE" ? "expense adds" : "income removes"} ${amount} ${transaction.type === "EXPENSE" ? "back to" : "from"} ${transaction.walletName}.`}{" "}
                                This cannot be undone. A record of the deletion
                                is kept in your audit history.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
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
                                disabled={pending}
                            >
                                {pending ? "Deleting…" : "Delete transaction"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </form>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
