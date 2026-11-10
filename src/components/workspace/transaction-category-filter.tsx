"use client"
import { CategoryMultiSelect } from "@/components/financial-accounts/category-multi-select"
import { Button } from "@/components/ui/button"
import type {
    CategoryChoice,
    CategorySelection,
} from "@/lib/category-selection"

/** Transactions add type context while sharing the category picker with budgets. */
export function TransactionCategoryFilter({
    id,
    categories,
    value,
    onChange,
    transactionType,
}: {
    id: string
    categories: CategoryChoice[]
    value: CategorySelection
    onChange: (value: CategorySelection) => void
    transactionType: string
}) {
    if (transactionType === "TRANSFER" || transactionType === "OPENING_BALANCE")
        return (
            <div className="grid gap-2">
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full justify-start px-3"
                    disabled
                >
                    All{" "}
                    {transactionType === "TRANSFER"
                        ? "transfers"
                        : "opening balances"}
                </Button>
                <p className="text-xs text-muted-foreground">
                    {transactionType === "TRANSFER"
                        ? "Transfers"
                        : "Opening balances"}{" "}
                    have no categories.
                </p>
            </div>
        )
    const choices =
        transactionType === "EXPENSE" || transactionType === "INCOME"
            ? categories.filter((c) => c.type === transactionType)
            : categories
    return (
        <CategoryMultiSelect
            id={id}
            categories={choices}
            value={value}
            onChange={onChange}
            label="Choose categories"
            groupByType={!transactionType}
        />
    )
}
