"use client"

import { formatWalletMoney } from "@/lib/wallet-input"
import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import {
    prepareWalletDeletion,
    deleteWallet,
} from "@/app/dashboard/accounts/[id]/wallets/actions"
import type { WalletDeletionPreview } from "@/lib/wallet-deletion-input"
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

export function WalletDeleteDialog({
    financialAccountId,
    wallet,
    disabled,
}: {
    financialAccountId: string
    wallet: { id: string; name: string }
    disabled?: boolean
}) {
    const [open, setOpen] = useState(false)
    const [preview, setPreview] = useState<WalletDeletionPreview | null>(null)
    const [message, setMessage] = useState("")
    const [loading, startLoading] = useTransition()
    const [deleting, startDeleting] = useTransition()
    const reference = { financialAccountId, accountWalletId: wallet.id }
    return (
        <AlertDialog
            open={open}
            onOpenChange={(next, details) => {
                if (deleting) {
                    details.cancel()
                    return
                }
                setOpen(next)
                if (next) {
                    setPreview(null)
                    setMessage("")
                    startLoading(async () => {
                        try {
                            const result =
                                await prepareWalletDeletion(reference)
                            if (result.preview) setPreview(result.preview)
                            else
                                setMessage(
                                    result.message ??
                                        "Unable to load this wallet."
                                )
                        } catch {
                            setMessage(
                                "We couldn’t load the deletion details. Close and try again."
                            )
                        }
                    })
                }
            }}
        >
            <AlertDialogTrigger
                render={<Button variant="outline" size="sm" />}
                disabled={disabled}
                aria-label={`Delete ${wallet.name}`}
            >
                <Trash2 data-icon="inline-start" />
                Delete
            </AlertDialogTrigger>
            <AlertDialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle className="break-words">
                        Delete {preview?.name ?? wallet.name} and its
                        transactions?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        This removes this wallet from every account using it and
                        permanently deletes all its transactions, including
                        Posted, Pending and opening balances. This cannot be
                        undone. Audit records are retained.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {loading && (
                    <p role="status" className="text-sm text-muted-foreground">
                        Checking affected accounts and transactions…
                    </p>
                )}
                {preview && (
                    <div className="flex flex-col gap-3 text-sm">
                        <p className="font-medium">
                            {preview.transactionCount.toLocaleString()}{" "}
                            transactions will be deleted:{" "}
                            {preview.postedCount.toLocaleString()} Posted and{" "}
                            {preview.pendingCount.toLocaleString()} Pending.
                        </p>
                        {preview.openingCount > 0 && (
                            <p className="text-muted-foreground">
                                Includes {preview.openingCount} opening{" "}
                                {preview.openingCount === 1
                                    ? "balance"
                                    : "balances"}
                                .
                            </p>
                        )}
                        {preview.balanceChanges &&
                            preview.balanceChanges.length > 0 && (
                                <div>
                                    <p className="font-medium">
                                        Posted balance changes (including linked
                                        transfers)
                                    </p>
                                    <ul className="flex flex-col gap-1">
                                        {preview.balanceChanges.map(
                                            (change, index) => (
                                                <li
                                                    key={index}
                                                    className="break-words"
                                                >
                                                    {change.account} ·{" "}
                                                    {change.wallet}:{" "}
                                                    {change.amount.startsWith(
                                                        "-"
                                                    )
                                                        ? ""
                                                        : "+"}
                                                    {formatWalletMoney(
                                                        change.amount,
                                                        change.currency
                                                    )}
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>
                            )}
                        <div>
                            <p className="font-medium">
                                Affected accounts ({preview.accounts.length})
                            </p>
                            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
                                {preview.accounts.map((account) => (
                                    <li
                                        key={account.id}
                                        className="break-words"
                                    >
                                        {account.name}
                                        {account.archived ? " (archived)" : ""}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
                {message && <FieldError role="alert">{message}</FieldError>}
                <AlertDialogFooter>
                    <AlertDialogCancel type="button" disabled={deleting}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        type="button"
                        variant="destructive"
                        disabled={loading || deleting || !preview}
                        onClick={() => {
                            if (!preview) return
                            setMessage("")
                            startDeleting(async () => {
                                try {
                                    const result = await deleteWallet({
                                        ...reference,
                                        expectedSnapshot:
                                            preview.expectedSnapshot,
                                    })
                                    if (result.success) setOpen(false)
                                    else
                                        setMessage(
                                            result.message ??
                                                "Deletion could not be confirmed."
                                        )
                                } catch {
                                    setMessage(
                                        "We couldn’t confirm deletion. Refresh to check the wallet or retry safely."
                                    )
                                }
                            })
                        }}
                    >
                        {deleting
                            ? "Deleting…"
                            : "Delete wallet and transactions"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
