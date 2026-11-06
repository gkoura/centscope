import { currencyOptions } from "./currency.ts"

export const reportingCurrencies = currencyOptions

export type CreateAccountState = {
    errors?: { name?: string; reportingCurrency?: string }
    message?: string
}

export function validateFinancialAccountInput(formData: FormData) {
    const rawName = formData.get("name")
    const name = typeof rawName === "string" ? rawName.trim() : ""
    const reportingCurrency = formData.get("reportingCurrency")
    const errors: NonNullable<CreateAccountState["errors"]> = {}
    if (!name || name.length > 80 || /[\p{Cc}\p{Cf}]/u.test(name)) {
        errors.name = "Enter an account name between 1 and 80 characters."
    }
    if (!reportingCurrencies.some(({ value }) => value === reportingCurrency)) {
        errors.reportingCurrency = "Choose a supported reporting currency."
    }
    if (Object.keys(errors).length) return { errors }
    return { data: { name, reportingCurrency: reportingCurrency as string } }
}
