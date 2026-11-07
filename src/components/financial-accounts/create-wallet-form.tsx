"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useActionState, useState } from "react"
import { createWallet } from "@/app/[locale]/dashboard/accounts/[id]/wallets/actions"
import {
    walletCurrencies,
    walletTypes,
    type WalletFormState,
} from "@/lib/wallet-input"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { StatusSwitch } from "./status-switch"
import { DatePicker } from "@/components/ui/date-picker"
import { Spinner } from "@/components/ui/spinner"

const initialState: WalletFormState = {}

function WalletSelectField({
    name,
    label,
    value,
    options,
    onChange,
    error,
    description,
}: {
    name: string
    label: string
    value: string
    options: readonly { value: string; label: string }[]
    onChange: (value: string) => void
    error?: string
    description?: string
}) {
    const t = useTranslations()

    const id = `wallet-${name}`
    return (
        <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={id}>{t(label || "")}</FieldLabel>
            <Select
                name={name}
                value={value}
                items={options.map((option) => ({
                    ...option,
                    label: t(option.label),
                }))}
                onValueChange={(next) => {
                    if (next) onChange(next)
                }}
            >
                <SelectTrigger
                    id={id}
                    className="w-full"
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                        [
                            description ? `${id}-description` : "",
                            error ? `${id}-error` : "",
                        ]
                            .filter(Boolean)
                            .join(" ") || undefined
                    }
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {t(option.label || "")}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
            {description ? (
                <FieldDescription id={`${id}-description`}>
                    {description}
                </FieldDescription>
            ) : null}
            {error ? (
                <FieldError id={`${id}-error`}>{t(error || "")}</FieldError>
            ) : null}
        </Field>
    )
}

export function CreateWalletForm({
    financialAccountId,
    requestId,
    defaultCurrency,
    today,
}: {
    financialAccountId: string
    requestId: string
    defaultCurrency: string
    today: string
}) {
    const t = useTranslations()

    const [state, action, pending] = useActionState(createWallet, initialState)
    const [values, setValues] = useState({
        name: "",
        type: "BANK",
        currency: defaultCurrency,
        openingBalance: "",
        openingDate: today,
        openingStatus: "POSTED",
    })
    const update = (key: keyof typeof values, value: string) =>
        setValues((previous) => ({ ...previous, [key]: value }))
    return (
        <form action={action} className="flex flex-col gap-6">
            <input
                type="hidden"
                name="financialAccountId"
                value={financialAccountId}
            />
            <input type="hidden" name="requestId" value={requestId} />
            <FieldGroup>
                <Field data-invalid={Boolean(state.errors?.name)}>
                    <FieldLabel htmlFor="wallet-name">
                        {t("Wallet name")}
                    </FieldLabel>
                    <Input
                        id="wallet-name"
                        name="name"
                        value={values.name}
                        onChange={(event) => update("name", event.target.value)}
                        required
                        maxLength={80}
                        placeholder={t("e.g. Everyday bank or Cash")}
                        aria-invalid={Boolean(state.errors?.name)}
                        aria-describedby={
                            state.errors?.name ? "wallet-name-error" : undefined
                        }
                    />
                    {state.errors?.name ? (
                        <FieldError id="wallet-name-error">
                            {t(state.errors.name || "")}
                        </FieldError>
                    ) : null}
                </Field>
                <WalletSelectField
                    name="type"
                    label={t("Wallet type")}
                    value={values.type}
                    options={walletTypes}
                    onChange={(value) => update("type", value)}
                    error={t(state.errors?.type || "")}
                />
                <WalletSelectField
                    name="currency"
                    label={t("Currency")}
                    value={values.currency}
                    options={walletCurrencies}
                    onChange={(value) => update("currency", value)}
                    error={t(state.errors?.currency || "")}
                    description={t(
                        "Balances stay in this currency. It can differ from your account’s reporting currency."
                    )}
                />
                <Field data-invalid={Boolean(state.errors?.openingBalance)}>
                    <FieldLabel htmlFor="wallet-opening-balance">
                        {t("Opening balance")}
                    </FieldLabel>
                    <Input
                        id="wallet-opening-balance"
                        name="openingBalance"
                        inputMode="decimal"
                        value={values.openingBalance}
                        onChange={(event) =>
                            update("openingBalance", event.target.value)
                        }
                        placeholder="0.00"
                        maxLength={24}
                        aria-invalid={Boolean(state.errors?.openingBalance)}
                        aria-describedby={`wallet-balance-description${state.errors?.openingBalance ? " wallet-balance-error" : ""}`}
                    />
                    <FieldDescription id="wallet-balance-description">
                        {t(
                            "How much this account has in the wallet on the date below. Use a decimal point; negative amounts are allowed. Leave blank to start at zero."
                        )}
                    </FieldDescription>
                    {state.errors?.openingBalance ? (
                        <FieldError id="wallet-balance-error">
                            {t(state.errors.openingBalance || "")}
                        </FieldError>
                    ) : null}
                </Field>
                <Field data-invalid={Boolean(state.errors?.openingDate)}>
                    <FieldLabel htmlFor="wallet-opening-date">
                        {t("Balance date")}
                    </FieldLabel>
                    <DatePicker
                        id="wallet-opening-date"
                        name="openingDate"
                        value={values.openingDate}
                        onChange={(value) => update("openingDate", value)}
                        aria-invalid={Boolean(state.errors?.openingDate)}
                        aria-describedby={
                            state.errors?.openingDate
                                ? "wallet-date-error"
                                : undefined
                        }
                    />
                    {state.errors?.openingDate ? (
                        <FieldError id="wallet-date-error">
                            {t(state.errors.openingDate || "")}
                        </FieldError>
                    ) : null}
                </Field>
                <StatusSwitch
                    name="openingStatus"
                    label={t("Opening balance status")}
                    value={values.openingStatus}
                    onValueChange={(value) => update("openingStatus", value)}
                    error={t(state.errors?.openingStatus || "")}
                    description={t(
                        "Posted counts toward your balance immediately. Pending does not. The date does not change the status. A zero opening balance creates no transaction."
                    )}
                />
            </FieldGroup>
            {state.message ||
            state.errors?.requestId ||
            state.errors?.financialAccountId ? (
                <FieldError role="alert">
                    {state.message ??
                        state.errors?.requestId ??
                        state.errors?.financialAccountId}
                </FieldError>
            ) : null}
            <Button type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? t("Creating wallet…") : t("Create wallet")}
            </Button>
        </form>
    )
}
