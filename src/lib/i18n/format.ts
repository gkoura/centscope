import type { AccountPeriod } from "../account-period"
import { intlLocale, type Locale } from "./config.ts"

export function formatPeriod(period: AccountPeriod, locale: Locale): string {
    if (period.view === "year") return period.year
    const formatter = new Intl.DateTimeFormat(intlLocale(locale), {
        ...(period.view === "month"
            ? ({ month: "long", year: "numeric" } as const)
            : ({ dateStyle: "medium" } as const)),
        timeZone: "UTC",
    })
    const from = formatter.format(new Date(`${period.from}T00:00:00Z`))
    return period.view === "month"
        ? from
        : `${from} – ${formatter.format(new Date(`${period.to}T00:00:00Z`))}`
}
