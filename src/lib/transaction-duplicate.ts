import { validDay } from "./account-period.ts"
import type { ExpenseSpread } from "./expense-spread.ts"

export function validCopyIntent(value: unknown): value is string {
    return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value
        )
    )
}

type CommonDraft = {
    name: string
    notes: string
    date: string
    status: "POSTED" | "PENDING"
    amount: string
}

export type TransactionDraft = CommonDraft & {
    type: "EXPENSE" | "INCOME"
    accountWalletId: string
    categoryId: string
    spread?: ExpenseSpread | null
}

export type TransferDraft = CommonDraft & {
    sourceId: string
    destinationId: string
    destinationAmount: string
}

function commonCopy(source: CommonDraft, date: string): CommonDraft {
    if (!validDay(date)) throw new Error("Choose a valid date for the copy.")
    return {
        name: source.name,
        notes: source.notes,
        status: source.status,
        amount: source.amount,
        date,
    }
}

export function transactionCopy(
    source: TransactionDraft,
    date: string
): TransactionDraft {
    return {
        ...commonCopy(source, date),
        type: source.type,
        accountWalletId: source.accountWalletId,
        categoryId: source.categoryId,
        spread:
            source.type === "EXPENSE" && source.spread
                ? {
                      startMonth: date.slice(0, 7),
                      monthCount: source.spread.monthCount,
                  }
                : null,
    }
}

export function transferCopy(
    source: TransferDraft,
    date: string
): TransferDraft {
    return {
        ...commonCopy(source, date),
        sourceId: source.sourceId,
        destinationId: source.destinationId,
        destinationAmount: source.destinationAmount,
    }
}
