export type ListOrderInput = { previousIds: string[]; orderedIds: string[] }
export type OrderSaveResult<T> =
    { success: true; items: T[] } | { success: false; message: string }

export function sameOrder(a: string[], b: string[]) {
    return a.length === b.length && a.every((id, index) => id === b[index])
}

export function validateListOrder(raw: unknown): ListOrderInput | null {
    if (!raw || typeof raw !== "object") return null
    const input = raw as Record<string, unknown>
    const ids = (value: unknown): value is string[] =>
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= 10000 &&
        value.every(
            (id) => typeof id === "string" && id.length > 0 && id.length <= 128
        ) &&
        new Set(value).size === value.length
    if (!ids(input.previousIds) || !ids(input.orderedIds)) return null
    const expected = new Set(input.previousIds)
    if (
        input.orderedIds.length !== input.previousIds.length ||
        !input.orderedIds.every((id) => expected.has(id))
    )
        return null
    return { previousIds: input.previousIds, orderedIds: input.orderedIds }
}
