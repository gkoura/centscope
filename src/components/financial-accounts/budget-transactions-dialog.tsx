"use client"
import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWorkspaceQuery } from "@/components/workspace/use-workspace-query"
import { WorkspaceQueryState } from "@/components/workspace/workspace-query-state"
import { budgetDetailRequest } from "./budget-prefetch"
import { currencySymbol } from "@/lib/currency"
import type { BudgetCadence } from "@/lib/budget-period"
import type { BudgetMode } from "@/lib/budget-contribution"
function money(amount: string, currency: string) {
    return `${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencySymbol(currency)}`
}
export function BudgetTransactionsDialog({
    accountId,
    budgetId,
    cadence,
    date,
    mode,
    onClose,
}: {
    accountId: string
    budgetId: string
    cadence: BudgetCadence
    date: string
    mode: BudgetMode
    onClose: () => void
}) {
    const [page, setPage] = useState(0)
    const request = budgetDetailRequest(
        accountId,
        budgetId,
        cadence,
        date,
        mode,
        page
    )
    const result = useWorkspaceQuery(
        "budgetTransactions",
        accountId,
        request.query
    )
    const data = result.error?.status === 410 ? undefined : result.data
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
        >
            <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {data?.name ?? "Budget transactions"}
                    </DialogTitle>
                    <DialogDescription>
                        {data
                            ? `${data.period.label} · ${mode === "smoothed" ? "Smoothed allocations" : "Actual payments"}`
                            : "Loading contributions to this budget…"}
                    </DialogDescription>
                </DialogHeader>
                {!data ? (
                    <>
                        {result.error?.status === 410 ? (
                            <p role="alert" className="text-sm">
                                This budget was removed. Close this popup and
                                refresh the page.
                            </p>
                        ) : (
                            <WorkspaceQueryState
                                queries={[result]}
                                label="Loading contributing transactions…"
                            />
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3">
                            <p className="text-xl font-semibold tabular-nums">
                                {money(data.total, data.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {data.count} contributing{" "}
                                {data.count === 1
                                    ? "transaction"
                                    : "transactions"}
                            </p>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            {mode === "smoothed"
                                ? "Amounts shown are the shares allocated to this period. The original payment may be outside it. Partial months are allocated by day; monthly totals match Analytics."
                                : "Posted expense payments dated within this period."}
                        </p>
                        {result.error && (
                            <p
                                role="alert"
                                className="text-xs text-destructive"
                            >
                                Couldn’t refresh. These values may be out of
                                date.
                            </p>
                        )}
                        <div className="min-h-0 overflow-y-auto overscroll-contain">
                            <ul className="divide-y">
                                {data.transactions.map((row) => (
                                    <li
                                        key={row.id}
                                        className="grid gap-2 py-4 pr-2"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-medium wrap-break-word">
                                                    {row.name}
                                                </p>
                                                <p className="mt-1 text-xs wrap-break-word text-muted-foreground">
                                                    {row.wallet} ·{" "}
                                                    {row.category}
                                                </p>
                                            </div>
                                            <span className="shrink-0 font-semibold tabular-nums">
                                                {money(
                                                    row.contribution,
                                                    data.currency
                                                )}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Paid {row.paidOn} · Original payment{" "}
                                            {money(
                                                row.originalAmount,
                                                data.currency
                                            )}
                                        </p>
                                        {row.allocations.length > 0 && (
                                            <details className="text-xs">
                                                <summary className="min-h-8 cursor-pointer py-2 font-medium text-primary">
                                                    Allocation details
                                                </summary>
                                                <ul className="space-y-2 rounded-lg bg-muted p-3">
                                                    {row.allocations.map(
                                                        (part) => (
                                                            <li
                                                                key={part.month}
                                                            >
                                                                {part.month}:{" "}
                                                                {money(
                                                                    part.contribution,
                                                                    data.currency
                                                                )}{" "}
                                                                counted here
                                                                from a{" "}
                                                                {money(
                                                                    part.monthlyAmount,
                                                                    data.currency
                                                                )}{" "}
                                                                monthly share.
                                                                <br />
                                                                <span className="text-muted-foreground">
                                                                    {part.from}{" "}
                                                                    to{" "}
                                                                    {part.until}{" "}
                                                                    (end
                                                                    excluded)
                                                                </span>
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </details>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            {!data.count && (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No posted expenses contribute in this
                                    period.
                                </p>
                            )}
                        </div>
                        {data.count > data.pageSize && (
                            <div className="flex items-center justify-between gap-2 border-t pt-3">
                                <Button
                                    variant="outline"
                                    className="min-h-11"
                                    disabled={page === 0}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    Previous
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                    {page * data.pageSize + 1}–
                                    {Math.min(
                                        (page + 1) * data.pageSize,
                                        data.count
                                    )}{" "}
                                    of {data.count}
                                </span>
                                <Button
                                    variant="outline"
                                    className="min-h-11"
                                    disabled={
                                        (page + 1) * data.pageSize >= data.count
                                    }
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
