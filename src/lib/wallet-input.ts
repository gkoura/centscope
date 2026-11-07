import { normalizeDecimalInput } from "./decimal-input.ts"
import { appendCurrencySymbol, currencyOptions } from "./currency.ts"

export const walletCurrencies = currencyOptions
export const walletTypes = [
    { value: "BANK", label: "Bank account" },
    { value: "CASH", label: "Cash" },
    { value: "OTHER", label: "Other" },
] as const
export const openingStatuses = [
    { value: "POSTED", label: "Posted" },
    { value: "PENDING", label: "Pending" },
] as const

export type WalletInput = {
    financialAccountId: string
    requestId: string
    name: string
    type: "BANK" | "CASH" | "OTHER"
    currency: "EUR" | "GBP" | "USD"
    openingBalance: string
    openingDate: string
    openingStatus: "POSTED" | "PENDING"
}

export type WalletFormState = {
    errors?: Partial<Record<keyof WalletInput, string>>
    values?: Partial<Record<keyof WalletInput, string>>
    message?: string
}

// Decimal text -> canonical decimal text. Never pass money through Number.
export function parseOpeningBalance(value: string): string | null {
    const text = normalizeDecimalInput(value) || "0"
    if (!/^-?(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/.test(text)) return null
    const negative = text.startsWith("-")
    const [whole, fraction = ""] = text.replace(/^-/, "").split(".")
    const cents = fraction.padEnd(2, "0")
    const sign = negative && (whole !== "0" || cents !== "00") ? "-" : ""
    return `${sign}${whole}.${cents}`
}

export function validateWalletInput(formData: FormData):
    | { data: WalletInput; errors?: never; values?: never }
    | {
          data?: never
          errors: NonNullable<WalletFormState["errors"]>
          values: NonNullable<WalletFormState["values"]>
      } {
    const get = (name: string) => {
        const value = formData.get(name)
        return typeof value === "string" ? value.trim() : ""
    }
    const values = {
        financialAccountId: get("financialAccountId"),
        requestId: get("requestId"),
        name: get("name"),
        type: get("type"),
        currency: get("currency"),
        openingBalance: get("openingBalance"),
        openingDate: get("openingDate"),
        openingStatus: get("openingStatus"),
    }
    const errors: NonNullable<WalletFormState["errors"]> = {}
    if (!values.financialAccountId || values.financialAccountId.length > 128)
        errors.financialAccountId = "This account is unavailable."
    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            values.requestId
        )
    )
        errors.requestId = "Reload this page and try again."
    if (
        !values.name ||
        values.name.length > 80 ||
        /[\p{Cc}\p{Cf}]/u.test(values.name)
    )
        errors.name = "Enter a wallet name between 1 and 80 characters."
    if (!walletTypes.some(({ value }) => value === values.type))
        errors.type = "Choose a wallet type."
    if (!walletCurrencies.some(({ value }) => value === values.currency))
        errors.currency = "Choose a supported currency."
    const openingBalance = parseOpeningBalance(values.openingBalance)
    if (openingBalance === null)
        errors.openingBalance =
            "Use up to 16 digits before the decimal point and 2 after it, for example -125.50."
    if (!openingStatuses.some(({ value }) => value === values.openingStatus))
        errors.openingStatus = "Choose Posted or Pending."
    const date = new Date(`${values.openingDate}T00:00:00.000Z`)
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(values.openingDate) ||
        !Number.isFinite(date.getTime()) ||
        date.getUTCFullYear() < 1 ||
        date.toISOString().slice(0, 10) !== values.openingDate
    )
        errors.openingDate = "Choose a valid balance date."
    if (Object.keys(errors).length) return { errors, values }
    return {
        data: { ...values, openingBalance: openingBalance! } as WalletInput,
    }
}

// Format exact decimal strings, including values above Number.MAX_SAFE_INTEGER.
export function formatWalletMoney(
    amount: string,
    currency: string,
    locale = "en-GB"
): string {
    const negative = amount.startsWith("-")
    const [whole, fraction = ""] = amount.replace(/^-/, "").split(".")
    const integer = BigInt(whole)
    const signed = negative ? (integer === BigInt(0) ? -0 : -integer) : integer
    const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
        .formatToParts(signed)
        .map((part) =>
            part.type === "fraction"
                ? fraction.padEnd(2, "0").slice(0, 2)
                : part.value
        )
        .join("")
    return appendCurrencySymbol(formatted, currency)
}

export type WalletDetailsInput = {
    financialAccountId: string
    accountWalletId: string
    expectedUpdatedAt: string
    expectedOpeningId: string | null
    expectedOpeningVersion: number | null
    openingBalance: string
    openingDate: string
    openingStatus: "POSTED" | "PENDING"
    name: string
    type: "BANK" | "CASH" | "OTHER"
}
export type WalletDetailsState = { message?: string; success?: boolean }
export function validateWalletDetails(
    form: FormData
): WalletDetailsInput | null {
    const get = (key: string) => {
        const value = form.get(key)
        return typeof value === "string" ? value.trim() : ""
    }
    const financialAccountId = get("financialAccountId"),
        accountWalletId = get("accountWalletId"),
        expectedUpdatedAt = get("expectedUpdatedAt"),
        name = get("name"),
        type = get("type"),
        openingId = get("expectedOpeningId"),
        openingVersion = get("expectedOpeningVersion"),
        openingBalance = parseOpeningBalance(get("openingBalance")),
        openingDate = get("openingDate"),
        openingStatus = get("openingStatus")
    const openingDay = new Date(`${openingDate}T00:00:00.000Z`)
    const date = new Date(expectedUpdatedAt)
    if (
        !financialAccountId ||
        financialAccountId.length > 128 ||
        !accountWalletId ||
        accountWalletId.length > 128 ||
        expectedUpdatedAt.length > 32 ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString() !== expectedUpdatedAt ||
        !name ||
        name.length > 80 ||
        /[\p{Cc}\p{Cf}]/u.test(name) ||
        (type !== "BANK" && type !== "CASH" && type !== "OTHER") ||
        !get("openingBalance") ||
        openingBalance === null ||
        !/^\d{4}-\d{2}-\d{2}$/.test(openingDate) ||
        !Number.isFinite(openingDay.getTime()) ||
        openingDay.getUTCFullYear() < 1 ||
        openingDay.toISOString().slice(0, 10) !== openingDate ||
        (openingStatus !== "POSTED" && openingStatus !== "PENDING") ||
        (openingId
            ? openingId.length > 128 ||
              !/^[1-9]\d{0,9}$/.test(openingVersion) ||
              Number(openingVersion) > 2147483646
            : openingVersion !== "")
    )
        return null
    return {
        financialAccountId,
        accountWalletId,
        expectedUpdatedAt,
        expectedOpeningId: openingId || null,
        expectedOpeningVersion: openingId ? Number(openingVersion) : null,
        openingBalance: openingBalance!,
        openingDate,
        openingStatus: openingStatus as "POSTED" | "PENDING",
        name,
        type,
    }
}
