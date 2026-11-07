"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useActionState } from "react"
import { createFinancialAccount } from "@/app/[locale]/dashboard/accounts/actions"
import {
    reportingCurrencies,
    type CreateAccountState,
} from "@/lib/financial-account-input"
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
import { Spinner } from "@/components/ui/spinner"

const initialState: CreateAccountState = {}

export function CreateAccountForm() {
    const t = useTranslations()

    const [state, action, pending] = useActionState(
        createFinancialAccount,
        initialState
    )
    return (
        <form action={action} className="flex flex-col gap-6">
            <FieldGroup>
                <Field data-invalid={Boolean(state.errors?.name)}>
                    <FieldLabel htmlFor="account-name">
                        {t("Account name")}
                    </FieldLabel>
                    <Input
                        id="account-name"
                        name="name"
                        placeholder={t("e.g. Personal or Home")}
                        required
                        maxLength={80}
                        aria-invalid={Boolean(state.errors?.name)}
                        aria-describedby={
                            state.errors?.name ? "name-error" : undefined
                        }
                    />
                    {state.errors?.name ? (
                        <FieldError id="name-error">
                            {t(state.errors.name || "")}
                        </FieldError>
                    ) : null}
                </Field>
                <Field data-invalid={Boolean(state.errors?.reportingCurrency)}>
                    <FieldLabel htmlFor="reporting-currency">
                        {t("Reporting currency")}
                    </FieldLabel>
                    <Select
                        name="reportingCurrency"
                        defaultValue="EUR"
                        items={reportingCurrencies.map((option) => ({
                            ...option,
                            label: t(option.label),
                        }))}
                    >
                        <SelectTrigger
                            id="reporting-currency"
                            className="w-full"
                            aria-invalid={Boolean(
                                state.errors?.reportingCurrency
                            )}
                            aria-describedby={
                                state.errors?.reportingCurrency
                                    ? "currency-description currency-error"
                                    : "currency-description"
                            }
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {reportingCurrencies.map(({ value, label }) => (
                                    <SelectItem key={value} value={value}>
                                        {t(label || "")}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <FieldDescription id="currency-description">
                        {t(
                            "Choose the currency for your account’s reports. Wallets can use other currencies."
                        )}
                    </FieldDescription>
                    {state.errors?.reportingCurrency ? (
                        <FieldError id="currency-error">
                            {t(state.errors.reportingCurrency || "")}
                        </FieldError>
                    ) : null}
                </Field>
            </FieldGroup>
            {state.message ? (
                <FieldError role="alert">{t(state.message || "")}</FieldError>
            ) : null}
            <Button type="submit" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {pending ? t("Creating account…") : t("Create account")}
            </Button>
        </form>
    )
}
