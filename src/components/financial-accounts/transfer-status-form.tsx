"use client"

import { currencySymbol } from "@/lib/currency"
import { useActionState, useState, useRef } from "react"
import { setTransferStatus } from "@/app/dashboard/accounts/[id]/transactions/transfer-actions"
import type { TransferFormState } from "@/lib/transfer-input"
import { StatusSwitch } from "./status-switch"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import {
    AlertDialog,
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
    compact = false,
    financialAccountId,
    transaction,
}: {
    compact?: boolean
    financialAccountId: string
    transaction: {
        id: string
        name: string
        version: number
        status: "POSTED" | "PENDING"
        transfer: { source: Endpoint; destination: Endpoint }
    }
}) {
    const [requested, setRequested] = useState<{
        version: number
        status: "POSTED" | "PENDING"
    } | null>(null)
    const [state, action, pending] = useActionState(
            async (previous: TransferFormState, form: FormData) => {
                const result = await setTransferStatus(previous, form)
                if (result.message || result.errors) setRequested(null)
                return result
            },
            {} as TransferFormState
        ),
        [open, setOpen] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)
    const switchRef = useRef<HTMLButtonElement>(null)
    const { source, destination } = transaction.transfer,
        target = transaction.status === "POSTED" ? "PENDING" : "POSTED",
        confirm =
            target === "POSTED" && source.currency !== destination.currency
    const awaitingRefresh = requested?.version === transaction.version
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
            <form
                ref={formRef}
                action={action}
                className="flex flex-col items-start gap-2"
            >
                {hidden}
                <StatusSwitch
                    compact={compact}
                    value={
                        awaitingRefresh ? requested.status : transaction.status
                    }
                    onValueChange={(next) => {
                        setRequested({
                            version: transaction.version,
                            status: next,
                        })
                        formRef.current?.requestSubmit()
                    }}
                    saving={pending || awaitingRefresh}
                    error={state.message}
                    accessibleLabel={`Posted status for ${transaction.name}`}
                    description="Posted updates both wallet balances. Pending does not."
                />
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
            <StatusSwitch
                compact={compact}
                value={transaction.status}
                onValueChange={() => setOpen(true)}
                controlRef={switchRef}
                disabled={pending}
                accessibleLabel={`Posted status for ${transaction.name}`}
                description="Confirm the actual amounts before posting this currency transfer."
            />
            {open && (
                <AlertDialogContent
                    finalFocus={switchRef}
                    className="max-h-[85svh] overflow-y-auto"
                >
                    <form
                        action={action}
                        onSubmit={() =>
                            setRequested({
                                version: transaction.version,
                                status: target,
                            })
                        }
                        className="flex flex-col gap-4"
                    >
                        {hidden}
                        <input type="hidden" name="confirmed" value="yes" />
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Confirm actual transfer amounts
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Posting updates both wallets together. Confirm
                                what left {source.walletName} and what arrived
                                in {destination.walletName}. This changes only
                                this occurrence.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <fieldset
                            disabled={pending}
                            className="flex flex-col gap-4"
                        >
                            <Field>
                                <FieldLabel
                                    htmlFor={`post-sent-${transaction.id}`}
                                >
                                    Amount sent (
                                    {currencySymbol(source.currency)})
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
                                    Amount received (
                                    {currencySymbol(destination.currency)})
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
                            <FieldError role="alert">
                                {state.message}
                            </FieldError>
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
            )}
        </AlertDialog>
    )
}
