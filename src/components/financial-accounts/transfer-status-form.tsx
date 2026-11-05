"use client"
import { useActionState, useState } from "react"
import { setTransferStatus } from "@/app/dashboard/accounts/[id]/transactions/transfer-actions"
import type { TransferFormState } from "@/lib/transfer-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
type Endpoint = { amount: string; currency: string; walletName: string }
export function TransferStatusForm({
    financialAccountId,
    transaction,
}: {
    financialAccountId: string
    transaction: {
        id: string
        name: string
        version: number
        status: "POSTED" | "PENDING"
        transfer: { source: Endpoint; destination: Endpoint }
    }
}) {
    const [state, action, pending] = useActionState(
            setTransferStatus,
            {} as TransferFormState
        ),
        [open, setOpen] = useState(false)
    const { source, destination } = transaction.transfer,
        target = transaction.status === "POSTED" ? "PENDING" : "POSTED",
        confirm =
            target === "POSTED" && source.currency !== destination.currency
    const hidden = (
        <>
            <input
                type="hidden"
                name="financialAccountId"
                value={financialAccountId}
            />
            <input type="hidden" name="transactionId" value={transaction.id} />
            <input
                type="hidden"
                name="expectedVersion"
                value={transaction.version}
            />
            <input type="hidden" name="status" value={target} />
        </>
    )
    if (!confirm)
        return (
            <form action={action} className="flex flex-col items-start gap-2">
                {hidden}
                <Button
                    size="sm"
                    variant="outline"
                    type="submit"
                    disabled={pending}
                    aria-label={`Mark ${transaction.name} as ${target.toLowerCase()}`}
                >
                    {pending ? "Saving…" : `Mark ${target.toLowerCase()}`}
                </Button>
                {state.message && (
                    <FieldError role="alert">{state.message}</FieldError>
                )}
            </form>
        )
    return (
        <AlertDialog
            open={open}
            onOpenChange={(value, details) => {
                if (pending) details.cancel()
                else setOpen(value)
            }}
        >
            <AlertDialogTrigger render={<Button size="sm" variant="outline" />}>
                Confirm and post
            </AlertDialogTrigger>
            <AlertDialogContent className="max-h-[85svh] overflow-y-auto">
                <form action={action} className="flex flex-col gap-4">
                    {hidden}
                    <input type="hidden" name="confirmed" value="yes" />
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Confirm actual transfer amounts
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Posting updates both wallets together. Confirm what
                            left {source.walletName} and what arrived in{" "}
                            {destination.walletName}. This changes only this
                            occurrence.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <fieldset
                        disabled={pending}
                        className="flex flex-col gap-4"
                    >
                        <Field>
                            <FieldLabel htmlFor={`post-sent-${transaction.id}`}>
                                Amount sent ({source.currency})
                            </FieldLabel>
                            <Input
                                id={`post-sent-${transaction.id}`}
                                name="amount"
                                inputMode="decimal"
                                defaultValue={source.amount}
                                required
                            />
                        </Field>
                        <Field>
                            <FieldLabel
                                htmlFor={`post-received-${transaction.id}`}
                            >
                                Amount received ({destination.currency})
                            </FieldLabel>
                            <Input
                                id={`post-received-${transaction.id}`}
                                name="destinationAmount"
                                inputMode="decimal"
                                defaultValue={destination.amount}
                                required
                            />
                        </Field>
                    </fieldset>
                    {state.message && (
                        <FieldError role="alert">{state.message}</FieldError>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel type="button" disabled={pending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction type="submit" disabled={pending}>
                            {pending ? "Posting…" : "Confirm and post"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </form>
            </AlertDialogContent>
        </AlertDialog>
    )
}
