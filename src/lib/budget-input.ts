import {
    parseCategorySelection,
    type CategorySelection,
} from "./category-selection.ts"
import { isBudgetCadence, type BudgetCadence } from "./budget-period.ts"
import { normalizeDecimalInput } from "./decimal-input.ts"
import { currencyOptions } from "./currency.ts"

export type BudgetInput = {
    financialAccountId: string
    id: string
    version: number
    name: string
    recurrence: BudgetCadence
    currency: string
    categorySelection: CategorySelection
    spendingLimit: string
}
export type BudgetState = { success?: boolean; message?: string }
export function validateBudgetInput(form: FormData): BudgetInput | null {
    const text = (key: string) =>
        typeof form.get(key) === "string"
            ? (form.get(key) as string).trim()
            : ""
    const data = {
        financialAccountId: text("financialAccountId"),
        id: text("id"),
        version: Number(text("version")),
        name: text("name"),
        recurrence: text("recurrence") as BudgetCadence,
        currency: text("currency"),
        categorySelection: parseCategorySelection(
            form.get("categorySelection")
        ),
        spendingLimit: normalizeDecimalInput(text("spendingLimit")),
    }
    if (
        !data.financialAccountId ||
        data.financialAccountId.length > 128 ||
        data.id.length > 128
    )
        return null
    if (
        !data.categorySelection ||
        (!data.categorySelection.all &&
            !data.categorySelection.uncategorized &&
            !data.categorySelection.categories.length)
    )
        return null
    if (data.id && (!Number.isSafeInteger(data.version) || data.version < 1))
        return null
    if (
        !data.name ||
        data.name.length > 80 ||
        /[\p{Cc}\p{Cf}]/u.test(data.name)
    )
        return null
    if (
        !isBudgetCadence(data.recurrence) ||
        !currencyOptions.some((c) => c.value === data.currency)
    )
        return null
    if (
        !/^\d{1,12}(\.\d{1,2})?$/.test(data.spendingLimit) ||
        !/[1-9]/.test(data.spendingLimit)
    )
        return null
    return { ...data, categorySelection: data.categorySelection }
}

export type BudgetSpendingGroup = {
    currency: string
    categoryId: string | null
    parentId: string | null
    // Signed ledger total, already restricted to posted expenses in the selected period.
    amount: string
}
