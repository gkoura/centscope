/** Normalize a decimal keypad separator without parsing or rounding money.
 * Grouping and mixed/repeated separators remain invalid in the money validators.
 */
export function normalizeDecimalInput(value: string): string {
    return value.trim().replace(",", ".")
}
