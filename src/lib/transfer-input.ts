import {
    readRepeat,
    validRepeat,
    type RepeatInput,
    type EditScope,
} from "./recurrence-input.ts"
export type TransferInput = {
    contextAccountId: string
    sourceId: string
    destinationId: string
    amount: string
    destinationAmount: string | null
    name: string
    notes: string | null
    date: string
    status: "POSTED" | "PENDING"
    requestId: string
    repeat?: RepeatInput | null
    editScope: EditScope
    expectedRuleVersion?: number
}
export type TransferFormState = {
    message?: string
    errors?: Partial<Record<keyof TransferInput, string>>
}
export function positiveTransferMoney(value: string): string | null {
    if (!/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/.test(value)) return null
    const [whole, part = ""] = value.split(".")
    const result = `${whole}.${part.padEnd(2, "0")}`
    return result === "0.00" ? null : result
}
export function validateTransferInput(form: FormData): {
    data?: TransferInput
    errors?: NonNullable<TransferFormState["errors"]>
} {
    const text = (key: string) =>
        typeof form.get(key) === "string" ? String(form.get(key)).trim() : ""
    const errors: NonNullable<TransferFormState["errors"]> = {}
    const amount = positiveTransferMoney(text("amount")),
        destinationAmount = text("destinationAmount")
            ? positiveTransferMoney(text("destinationAmount"))
            : null
    const date = text("date"),
        parsed = new Date(`${date}T00:00:00Z`),
        scope = text("editScope") || "ONLY"
    for (const key of [
        "contextAccountId",
        "sourceId",
        "destinationId",
    ] as const)
        if (!text(key) || text(key).length > 128)
            errors[key] = "Choose an available account and wallet."
    if (text("sourceId") === text("destinationId"))
        errors.destinationId = "Choose a different wallet allocation."
    if (!amount)
        errors.amount = "Enter a positive amount with up to two decimal places."
    if (text("destinationAmount") && !destinationAmount)
        errors.destinationAmount =
            "Enter a positive received amount with up to two decimal places."
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        date.startsWith("0000") ||
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date
    )
        errors.date = "Choose a valid date."
    const name = text("name") || "Transfer",
        notes = text("notes") || null
    if (name.length > 120 || /[\p{Cc}\p{Cf}]/u.test(name))
        errors.name = "Use a name up to 120 characters."
    if (notes && (notes.length > 2000 || notes.includes("\0")))
        errors.notes = "Use notes up to 2,000 characters."
    if (!["POSTED", "PENDING"].includes(text("status")))
        errors.status = "Choose Posted or Pending."
    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            text("requestId")
        )
    )
        errors.requestId = "Reload this form."
    const repeat = readRepeat(form)
    if (repeat && !validRepeat(repeat, date))
        errors.repeat = "Choose a valid repeat schedule."
    if (!["ONLY", "FUTURE", "ALL"].includes(scope))
        errors.editScope = "Choose which occurrences to edit."
    const expectedRuleVersion = Number(text("expectedRuleVersion"))
    if (
        scope !== "ONLY" &&
        (form.get("seriesConfirmed") !== "yes" ||
            !Number.isSafeInteger(expectedRuleVersion) ||
            expectedRuleVersion < 1)
    )
        errors.editScope = "Confirm this series edit, or reload if it changed."
    if (Object.keys(errors).length) return { errors }
    return {
        data: {
            contextAccountId: text("contextAccountId"),
            sourceId: text("sourceId"),
            destinationId: text("destinationId"),
            amount: amount!,
            destinationAmount,
            name,
            notes,
            date,
            status: text("status") as TransferInput["status"],
            requestId: text("requestId"),
            editScope: scope as EditScope,
            ...(repeat ? { repeat } : {}),
            ...(scope !== "ONLY" ? { expectedRuleVersion } : {}),
        },
    }
}

export function transferRate(sent: string, received: string): string | null {
    const a = positiveTransferMoney(sent),
        b = positiveTransferMoney(received)
    if (!a || !b) return null
    const cents = (v: string) => BigInt(v.replace(".", ""))
    const scaled =
        (cents(b) * BigInt(100000000) + cents(a) / BigInt(2)) / cents(a)
    if (scaled === BigInt(0)) return "<0.00000001"
    return (
        `${scaled / BigInt(100000000)}.${String(scaled % BigInt(100000000)).padStart(8, "0")}`.replace(
            /\.?0+$/,
            ""
        ) || "0"
    )
}
