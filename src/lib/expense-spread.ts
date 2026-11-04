export type ExpenseSpread = { startMonth: string; monthCount: number }

export function validMonth(month: string): boolean {
    return /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month)
}
export function shiftMonth(month: string, offset: number): string {
    const index =
        Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1 + offset
    return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`
}
export function validSpread(spread: ExpenseSpread): boolean {
    return (
        validMonth(spread.startMonth) &&
        Number.isInteger(spread.monthCount) &&
        spread.monthCount >= 2 &&
        spread.monthCount <= 120 &&
        validMonth(shiftMonth(spread.startMonth, spread.monthCount - 1))
    )
}
export function moneyCents(amount: string): bigint {
    if (!/^-?\d+(?:\.\d{1,2})?$/.test(amount)) throw new Error("Invalid money")
    const [whole, fraction = ""] = amount.replace(/^-/, "").split(".")
    const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"))
    return amount.startsWith("-") ? -cents : cents
}
export function centsMoney(cents: bigint): string {
    const absolute = cents < BigInt(0) ? -cents : cents
    return `${cents < BigInt(0) ? "-" : ""}${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, "0")}`
}
export function monthlyShare(
    amount: string,
    spread: ExpenseSpread,
    month: string
): string {
    const offset =
        (Number(month.slice(0, 4)) - Number(spread.startMonth.slice(0, 4))) *
            12 +
        Number(month.slice(5)) -
        Number(spread.startMonth.slice(5))
    if (offset < 0 || offset >= spread.monthCount) return "0.00"
    const total = moneyCents(amount)
    const count = BigInt(spread.monthCount)
    return centsMoney(
        total / count + (BigInt(offset) < total % count ? BigInt(1) : BigInt(0))
    )
}
