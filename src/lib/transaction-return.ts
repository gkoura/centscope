import { validDay, type AccountPeriod } from "./account-period.ts"

/** Only return to the authorized account's transaction list. */
export function transactionReturnPath(
    value: unknown,
    accountId: string,
    date?: string
) {
    const base = `/dashboard/accounts/${accountId}/transactions`
    if (
        typeof value === "string" &&
        value.length <= 4096 &&
        value.startsWith(`${base}?`)
    ) {
        const url = new URL(value, "https://fintrack.invalid")
        if (url.origin === "https://fintrack.invalid" && url.pathname === base)
            return `${base}${url.search}`
    }
    return date && validDay(date)
        ? `${base}?view=month&month=${date.slice(0, 7)}`
        : base
}
export function periodEntryDate(period: AccountPeriod, today: string) {
    return today < period.from
        ? period.from
        : today > period.to
          ? period.to
          : today
}
