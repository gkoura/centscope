"use client"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"
import { currencySymbol } from "@/lib/currency"
import type { WorkspaceData } from "@/lib/workspace-data"
export type Budget = WorkspaceData["budgets"]["budgets"][number]
function money(value: string, currency: string) {
    return `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencySymbol(currency)}`
}
export function BudgetCard({
    budget,
    onEdit,
    onDelete,
    onView,
    onPrefetch,
    handle,
    disabled = false,
}: {
    budget: Budget
    onEdit: (budget: Budget) => void
    onDelete: (budget: Budget) => void
    onView: (budget: Budget) => void
    onPrefetch: () => void
    handle?: ReactNode
    disabled?: boolean
}) {
    const over = budget.remaining.startsWith("-")
    const near = budget.percentage >= 80
    return (
        <article
            key={budget.id}
            className="relative min-w-0 rounded-2xl border bg-card p-5"
        >
            <button
                type="button"
                className="absolute inset-0 rounded-2xl outline-none hover:ring-1 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
                disabled={disabled}
                aria-label={`View transactions for ${budget.name}, ${money(budget.spent, budget.currency)} spent`}
                onClick={() => onView(budget)}
                onPointerEnter={onPrefetch}
                onFocus={onPrefetch}
            />
            <div className="pointer-events-none relative">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h2 className="font-semibold wrap-break-word">
                            {budget.name}
                        </h2>
                        <p className="mt-1 text-xs wrap-break-word text-muted-foreground">
                            {budget.categoryLabel} · {budget.currency}
                        </p>
                    </div>
                    <div className="pointer-events-auto relative z-10 flex shrink-0">
                        {handle}
                        <Button
                            disabled={disabled}
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            aria-label={`Edit ${budget.name}`}
                            onClick={() => onEdit(budget)}
                        >
                            <Pencil className="size-4" />
                        </Button>
                        <Button
                            disabled={disabled}
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            aria-label={`Remove ${budget.name}`}
                            onClick={() => onDelete(budget)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                </div>
                <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-xl font-semibold tabular-nums">
                        {money(budget.spent, budget.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        of {money(budget.spendingLimit, budget.currency)}
                    </p>
                </div>
                <div
                    role="progressbar"
                    aria-label={`${budget.name} spending`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(
                        100,
                        Math.max(0, Math.round(budget.percentage))
                    )}
                    aria-valuetext={`${money(budget.spent, budget.currency)} spent of ${money(budget.spendingLimit, budget.currency)}`}
                    className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                >
                    <div
                        className={`h-full rounded-full ${over ? "bg-destructive" : near ? "bg-amber-500" : "bg-primary"}`}
                        style={{
                            width: `${Math.min(100, Math.max(0, budget.percentage))}%`,
                        }}
                    />
                </div>
                <p
                    className={`mt-3 text-sm font-medium tabular-nums ${over ? "text-destructive" : "text-muted-foreground"}`}
                >
                    {over
                        ? `${money(budget.remaining.replace("-", ""), budget.currency)} over budget`
                        : `${money(budget.remaining, budget.currency)} left`}
                    {!over && near ? " · Near your limit" : ""}
                </p>
                <p className="mt-3 text-xs text-primary">
                    View contributing transactions →
                </p>
            </div>
        </article>
    )
}
