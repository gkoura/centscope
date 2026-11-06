export const currencyOptions = [
    { value: "EUR", label: "€ — Euro" },
    { value: "GBP", label: "£ — British pound" },
    { value: "USD", label: "$ — US dollar" },
] as const

const symbols: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" }

export function currencySymbol(currency: string): string {
    return symbols[currency] ?? currency
}

export function appendCurrencySymbol(amount: string, currency: string): string {
    return `${amount} ${currencySymbol(currency)}`
}

export function currencyLabel(currency: string): string {
    return (
        currencyOptions.find((option) => option.value === currency)?.label ??
        currency
    )
}
