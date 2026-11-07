"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { currencySymbol } from "@/lib/currency"
import { useActionState, useState } from "react"
import { saveTransfer } from "@/app/[locale]/dashboard/accounts/[id]/transactions/transfer-actions"
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
    const t = useTranslations()

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
        name: editing?.name ?? t("Transfer"),
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
            label = side === "source" ? t("From") : t("To")
        return (
            <Field>
                <FieldLabel htmlFor={`${side}-wallet`}>
                    {t(label || "")} {t("wallet")}
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
                            {t("Choose a different destination wallet.")}
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
                        {t("Swap wallets")}
                    </Button>
                    <Field>
                        <FieldLabel htmlFor="transfer-amount">
                            {fx ? t("Amount sent") : t("Amount")} (
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
                                {t("Amount received (")}
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
                                {t(
                                    "Pending amounts are estimates; confirm the actual amounts when posting."
                                )}
                            </FieldDescription>
                        </Field>
                    )}
                    <p className="text-sm text-muted-foreground">
                        {t(
                            "Transfers move money between wallets in this account without counting as income or spending. Record bank fees as a separate expense."
                        )}
                    </p>
                    <Field>
                        <FieldLabel htmlFor="transfer-name">
                            {t("Name")}
                        </FieldLabel>
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
                        error={t(state.errors?.repeat || "")}
                        scopeError={t(state.errors?.editScope || "")}
                        onScopeChange={(value) => {
                            setScope(value)
                            if (value !== "ONLY" && editing)
                                update("date", editing.date)
                        }}
                    />
                    <Field>
                        <FieldLabel htmlFor="transfer-date">
                            {t("Date")}
                        </FieldLabel>
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
                    <StatusSwitch
                        name="status"
                        value={values.status}
                        onValueChange={(value) => update("status", value)}
                        error={t(state.errors?.status || "")}
                        description={t(
                            "Posted affects both wallets now. Pending affects neither balance. Dates never change status automatically."
                        )}
                    />
                    <Field>
                        <FieldLabel htmlFor="transfer-notes">
                            {t("Notes (optional)")}
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
                <FieldError role="alert">{t(state.message || "")}</FieldError>
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
                    ? t("Saving…")
                    : editing
                      ? t("Save transfer")
                      : t("Create transfer")}
            </Button>
        </form>
    )
}
