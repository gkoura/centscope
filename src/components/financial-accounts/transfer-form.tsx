"use client"

import { currencySymbol } from "@/lib/currency"
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
import { StatusSwitch } from "./status-switch"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "./money-input"
import { Textarea } from "@/components/ui/textarea"
const selectClass =
    "h-10 w-full min-w-0 rounded-md border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-ring sm:text-sm"
type Editing = NonNullable<Awaited<ReturnType<typeof getOwnedEditableTransfer>>>
export function TransferForm({
    returnTo,
    contextAccountId,
    wallets,
    requestId,
    today,
    sourceId,
    editing,
}: {
    returnTo?: string
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
                            {w.wallet.name} ({currencySymbol(w.wallet.currency)}
                            )
                        </option>
                    ))}
                </select>
            </Field>
        )
    }
    return (
        <form action={action} className="flex flex-col gap-6">
            <input type="hidden" name="returnTo" value={returnTo ?? ""} />
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
                            {currencySymbol(source?.wallet.currency ?? "")})
                        </FieldLabel>
                        <MoneyInput
                            id="transfer-amount"
                            name="amount"
                            value={values.amount}
                            required
                            onValueChange={(value) => update("amount", value)}
                        />
                    </Field>
                    {fx && (
                        <Field>
                            <FieldLabel htmlFor="transfer-received">
                                Amount received (
                                {currencySymbol(
                                    destination?.wallet.currency ?? ""
                                )}
                                )
                            </FieldLabel>
                            <MoneyInput
                                id="transfer-received"
                                name="destinationAmount"
                                required
                                value={values.destinationAmount}
                                onValueChange={(value) =>
                                    update("destinationAmount", value)
                                }
                            />
                            <FieldDescription>
                                {rate
                                    ? `1 ${currencySymbol(source?.wallet.currency ?? "")} = ${rate} ${currencySymbol(destination?.wallet.currency ?? "")}. `
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
                        <DatePicker
                            id="transfer-date"
                            name="date"
                            value={values.date}
                            disabled={scope !== "ONLY"}
                            required
                            onChange={(value) => update("date", value)}
                        />
                    </Field>
                    <StatusSwitch
                        name="status"
                        value={values.status}
                        onValueChange={(value) => update("status", value)}
                        error={state.errors?.status}
                        description="Posted affects both wallets now. Pending affects neither balance. Dates never change status automatically."
                    />
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
