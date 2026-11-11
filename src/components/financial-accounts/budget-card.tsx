"use client"
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react"
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
            className="relative min-w-0 rounded-xl border bg-card p-3"
        >
            <button
                type="button"
                className="absolute inset-0 rounded-xl outline-none hover:ring-1 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
                disabled={disabled}
                aria-label={`View transactions for ${budget.name}, ${money(budget.spent, budget.currency)} spent`}
                onClick={() => onView(budget)}
                onPointerEnter={onPrefetch}
                onFocus={onPrefetch}
            />
            <div className="pointer-events-none relative">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h2 className="font-semibold wrap-break-word">
                            {budget.name}
                        </h2>
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
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-lg font-semibold tabular-nums">
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
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                >
                    <div
                        className={`h-full rounded-full ${over ? "bg-destructive" : near ? "bg-amber-500" : "bg-primary"}`}
                        style={{
                            width: `${Math.min(100, Math.max(0, budget.percentage))}%`,
                        }}
                    />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                    <p
                        className={`text-xs font-medium tabular-nums ${over ? "text-destructive" : "text-muted-foreground"}`}
                    >
                        {over
                            ? `${money(budget.remaining.replace("-", ""), budget.currency)} over budget`
                            : `${money(budget.remaining, budget.currency)} left`}
                        {!over && near ? " · Near your limit" : ""}
                    </p>
                    <ArrowUpRight
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-muted-foreground"
                    />
                </div>
            </div>
        </article>
    )
}
