"use client"
import { useActionState, useState } from "react"
import { saveTransfer } from "@/app/dashboard/accounts/[id]/transactions/transfer-actions"
import { type TransferFormState, transferRate } from "@/lib/transfer-input"
import type {
    getOwnedEditableTransfer,
    listOwnedTransferWallets,
} from "@/lib/transfers"
import { RecurrenceFields } from "./recurrence-fields"
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
    FieldGroup,
} from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
const selectClass =
    "h-10 w-full min-w-0 rounded-md border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-ring sm:text-sm"
type Editing = NonNullable<Awaited<ReturnType<typeof getOwnedEditableTransfer>>>
export function TransferForm({
    contextAccountId,
    wallets,
    requestId,
    today,
    sourceId,
    editing,
}: {
    contextAccountId: string
    wallets: Awaited<ReturnType<typeof listOwnedTransferWallets>>
    requestId: string
    today: string
    sourceId?: string
    editing?: Editing
}) {
    const first =
        wallets.find(
            (w) =>
                w.id === sourceId && w.financialAccountId === contextAccountId
        ) ??
        wallets.find((w) => w.financialAccountId === contextAccountId) ??
        wallets[0]
    const [values, setValues] = useState({
        sourceId: editing?.sourceId ?? first?.id ?? "",
        destinationId:
            editing?.destinationId ??
            wallets.find(
                (w) =>
                    w.id !== first?.id &&
                    w.financialAccountId === contextAccountId
            )?.id ??
            wallets.find((w) => w.id !== first?.id)?.id ??
            "",
        amount: editing?.amount ?? "",
        destinationAmount: editing?.destinationAmount ?? "",
        name: editing?.name ?? "Transfer",
        notes: editing?.notes ?? "",
        date: editing?.date ?? today,
        status: editing?.status ?? "POSTED",
    })
    const [scope, setScope] = useState<"ONLY" | "FUTURE" | "ALL">("ONLY"),
        [state, action, pending] = useActionState(
            saveTransfer,
            {} as TransferFormState
        )
    const update = (key: keyof typeof values, value: string) =>
        setValues((previous) => ({ ...previous, [key]: value }))
    const source = wallets.find((w) => w.id === values.sourceId),
        destination = wallets.find((w) => w.id === values.destinationId),
        fx = Boolean(
            source &&
            destination &&
            source.wallet.currency !== destination.wallet.currency
        ),
        rate = fx ? transferRate(values.amount, values.destinationAmount) : null
    const eligible = (side: "source" | "destination") =>
        wallets.filter(
            (w) =>
                w.financialAccountId === contextAccountId &&
                (!editing ||
                    w.wallet.currency ===
                        (side === "source"
                            ? editing.sourceCurrency
                            : editing.destinationCurrency))
        )
    const walletPicker = (side: "source" | "destination") => {
        const idKey = side === "source" ? "sourceId" : "destinationId",
            options = eligible(side),
            label = side === "source" ? "From" : "To"
        return (
            <Field>
                <FieldLabel htmlFor={`${side}-wallet`}>
                    {label} wallet
                </FieldLabel>
                <select
                    id={`${side}-wallet`}
                    name={idKey}
                    className={selectClass}
                    value={values[idKey]}
                    required
                    onChange={(event) => update(idKey, event.target.value)}
                >
                    {options.map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.wallet.name} ({w.wallet.currency})
                        </option>
                    ))}
                </select>
            </Field>
        )
    }
    return (
        <form action={action} className="flex flex-col gap-6">
            <input
                type="hidden"
                name="contextAccountId"
                value={contextAccountId}
            />
            <input type="hidden" name="requestId" value={requestId} />
            {editing && (
                <>
                    <input
                        type="hidden"
                        name="transactionId"
                        value={editing.id}
                    />
                    <input
                        type="hidden"
                        name="expectedVersion"
                        value={editing.version}
                    />
                </>
            )}
            <fieldset disabled={pending} className="contents">
                <FieldGroup>
                    {walletPicker("source")}
                    {walletPicker("destination")}
                    {source && destination && source.id === destination.id && (
                        <FieldError role="alert">
                            Choose a different destination wallet.
                        </FieldError>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        disabled={Boolean(
                            editing &&
                            editing.sourceCurrency !==
                                editing.destinationCurrency
                        )}
                        onClick={() =>
                            setValues((v) => ({
                                ...v,
                                sourceId: v.destinationId,
                                destinationId: v.sourceId,
                                amount: fx ? v.destinationAmount : v.amount,
                                destinationAmount: fx
                                    ? v.amount
                                    : v.destinationAmount,
                            }))
                        }
                    >
                        Swap wallets
                    </Button>
                    <Field>
                        <FieldLabel htmlFor="transfer-amount">
                            {fx ? "Amount sent" : "Amount"} (
                            {source?.wallet.currency})
                        </FieldLabel>
                        <Input
                            id="transfer-amount"
                            name="amount"
                            inputMode="decimal"
                            value={values.amount}
                            required
                            onChange={(e) => update("amount", e.target.value)}
                        />
                    </Field>
                    {fx && (
                        <Field>
                            <FieldLabel htmlFor="transfer-received">
                                Amount received ({destination?.wallet.currency})
                            </FieldLabel>
                            <Input
                                id="transfer-received"
                                name="destinationAmount"
                                inputMode="decimal"
                                required
                                value={values.destinationAmount}
                                onChange={(e) =>
                                    update("destinationAmount", e.target.value)
                                }
                            />
                            <FieldDescription>
                                {rate
                                    ? `1 ${source?.wallet.currency} = ${rate} ${destination?.wallet.currency}. `
                                    : ""}
                                Pending amounts are estimates; confirm the
                                actual amounts when posting.
                            </FieldDescription>
                        </Field>
                    )}
                    <p className="text-sm text-muted-foreground">
                        Transfers move money between wallets in this account
                        without counting as income or spending. Record bank fees
                        as a separate expense.
                    </p>
                    <Field>
                        <FieldLabel htmlFor="transfer-name">Name</FieldLabel>
                        <Input
                            id="transfer-name"
                            name="name"
                            maxLength={120}
                            value={values.name}
                            onChange={(e) => update("name", e.target.value)}
                        />
                    </Field>
                    <RecurrenceFields
                        initial={editing?.recurrence}
                        date={values.date}
                        error={state.errors?.repeat}
                        scopeError={state.errors?.editScope}
                        onScopeChange={(value) => {
                            setScope(value)
                            if (value !== "ONLY" && editing)
                                update("date", editing.date)
                        }}
                    />
                    <Field>
                        <FieldLabel htmlFor="transfer-date">Date</FieldLabel>
                        <Input
                            id="transfer-date"
                            type="date"
                            name="date"
                            value={values.date}
                            disabled={scope !== "ONLY"}
                            required
                            onChange={(e) => update("date", e.target.value)}
                        />
                        {scope !== "ONLY" && (
                            <input
                                type="hidden"
                                name="date"
                                value={editing?.date ?? values.date}
                            />
                        )}
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="transfer-status">
                            Status
                        </FieldLabel>
                        <select
                            id="transfer-status"
                            name="status"
                            className={selectClass}
                            value={values.status}
                            onChange={(e) => update("status", e.target.value)}
                        >
                            <option value="POSTED">Posted</option>
                            <option value="PENDING">Pending</option>
                        </select>
                        <FieldDescription>
                            Posted affects both wallets now. Pending affects
                            neither balance. Dates never change status
                            automatically.
                        </FieldDescription>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="transfer-notes">
                            Notes (optional)
                        </FieldLabel>
                        <Textarea
                            id="transfer-notes"
                            name="notes"
                            maxLength={2000}
                            value={values.notes}
                            onChange={(e) => update("notes", e.target.value)}
                        />
                    </Field>
                </FieldGroup>
            </fieldset>
            {state.errors && (
                <FieldError role="alert">
                    {Object.values(state.errors).join(" ")}
                </FieldError>
            )}
            {state.message && (
                <FieldError role="alert">{state.message}</FieldError>
            )}
            <Button
                type="submit"
                disabled={
                    pending ||
                    !source ||
                    !destination ||
                    source.id === destination.id
                }
            >
                {pending
                    ? "Saving…"
                    : editing
                      ? "Save transfer"
                      : "Create transfer"}
            </Button>
        </form>
    )
}
