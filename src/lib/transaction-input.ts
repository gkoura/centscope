export const transactionTypes = [
    { value: "EXPENSE", label: "Expense" },
    { value: "INCOME", label: "Income" },
] as const

export type TransactionInput = {
    financialAccountId: string
    accountWalletId: string
    categoryId: string
    requestId: string
    type: "EXPENSE" | "INCOME"
    name: string
    amount: string
    date: string
    status: "POSTED" | "PENDING"
    notes: string | null
}
export type TransactionFormState = {
    errors?: Partial<Record<keyof TransactionInput, string>>
    message?: string
}

function text(form: FormData, key: string) {
    const value = form.get(key)
    return typeof value === "string" ? value.trim() : ""
}

export function validateTransactionInput(
    form: FormData
):
    | { data: TransactionInput; errors?: never }
    | { data?: never; errors: NonNullable<TransactionFormState["errors"]> } {
    const values = {
        financialAccountId: text(form, "financialAccountId"),
        accountWalletId: text(form, "accountWalletId"),
        categoryId: text(form, "categoryId"),
        requestId: text(form, "requestId"),
        type: text(form, "type"),
        name: text(form, "name"),
        amount: text(form, "amount"),
        date: text(form, "date"),
        status: text(form, "status"),
        notes: text(form, "notes") || null,
    }
    const errors: NonNullable<TransactionFormState["errors"]> = {}
    for (const key of [
        "financialAccountId",
        "accountWalletId",
        "categoryId",
    ] as const) {
        if (!values[key] || values[key].length > 128)
            errors[key] =
                key === "categoryId"
                    ? "Choose a category."
                    : "Choose an available account and wallet."
    }
    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            values.requestId
        )
    )
        errors.requestId = "Reload this page and try again."
    if (
        !values.name ||
        values.name.length > 120 ||
        /[\p{Cc}\p{Cf}]/u.test(values.name)
    )
        errors.name = "Enter a name between 1 and 120 characters."
    if (values.type !== "EXPENSE" && values.type !== "INCOME")
        errors.type = "Choose Expense or Income."
    if (values.status !== "POSTED" && values.status !== "PENDING")
        errors.status = "Choose Posted or Pending."
    let amount = ""
    if (/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/.test(values.amount)) {
        const [whole, fraction = ""] = values.amount.split(".")
        amount = `${whole}.${fraction.padEnd(2, "0")}`
    }
    if (!amount || amount === "0.00")
        errors.amount =
            "Enter a positive amount with up to 16 integer digits and 2 decimal places."
    const date = new Date(`${values.date}T00:00:00.000Z`)
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(values.date) ||
        !Number.isFinite(date.getTime()) ||
        date.getUTCFullYear() < 1 ||
        date.toISOString().slice(0, 10) !== values.date
    )
        errors.date = "Choose a valid date."
    if (
        values.notes &&
        (values.notes.length > 2000 || values.notes.includes("\0"))
    )
        errors.notes =
            "Notes must be at most 2,000 characters without null characters."
    if (Object.keys(errors).length) return { errors }
    return { data: { ...values, amount } as TransactionInput }
}

export function validateStatusInput(form: FormData): {
    financialAccountId: string
    transactionId: string
    status: "POSTED" | "PENDING"
    expectedVersion: number
} | null {
    const financialAccountId = text(form, "financialAccountId"),
        transactionId = text(form, "transactionId"),
        status = text(form, "status"),
        version = text(form, "expectedVersion")
    if (
        !financialAccountId ||
        financialAccountId.length > 128 ||
        !transactionId ||
        transactionId.length > 128 ||
        (status !== "POSTED" && status !== "PENDING") ||
        !/^[1-9]\d{0,9}$/.test(version) ||
        Number(version) > 2147483646
    )
        return null
    return {
        financialAccountId,
        transactionId,
        status,
        expectedVersion: Number(version),
    }
}

export type TransactionSuggestion = {
    id: string
    name: string
    type: "EXPENSE" | "INCOME"
    categoryId: string
    subcategoryId: string | null
    categoryLabel: string
}
