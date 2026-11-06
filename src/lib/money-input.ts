export function moneyInputLocale(locale: string) {
    const parts = new Intl.NumberFormat(locale, {
        numberingSystem: "latn",
    }).formatToParts(1234567.89)
    const integers = parts.filter((part) => part.type === "integer")
    return {
        decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
        group: parts.find((part) => part.type === "group")?.value ?? ",",
        grouping: integers.at(-2)?.value.length === 2 ? "lakh" : "thousand",
    } as const
}

// Editing permits an empty field or a trailing decimal; submission still uses
// the strict server validator. Never convert monetary text through Number.
export function validMoneyDraft(value: string): boolean {
    return /^\d{0,16}(?:\.\d{0,2})?$/.test(value)
}

export function unformatMoneyInput(value: string, locale: string): string {
    const { group, decimal } = moneyInputLocale(locale)
    return value.replaceAll(group, "").replace(decimal, ".")
}

export function parseMoneyPaste(value: string, locale: string): string | null {
    const text = value.trim()
    // Accept ungrouped amounts with either keypad separator in every locale.
    if (/^\d{1,16}(?:[.,]\d{1,2})?$/.test(text)) return text.replace(",", ".")
    const { group, decimal, grouping } = moneyInputLocale(locale)
    const escape = (part: string) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const grouped =
        grouping === "lakh"
            ? `(?:\\d{1,3}|\\d{1,2}(?:${escape(group)}\\d{2})+)${escape(group)}\\d{3}`
            : `\\d{1,3}(?:${escape(group)}\\d{3})+`
    const normalized = /\s/u.test(group)
        ? text.replace(/[ \u00a0\u202f]/g, group)
        : text
    if (
        !new RegExp(`^${grouped}(?:${escape(decimal)}\\d{1,2})?$`).test(
            normalized
        )
    )
        return null
    const result = unformatMoneyInput(normalized, locale)
    return validMoneyDraft(result) ? result : null
}
