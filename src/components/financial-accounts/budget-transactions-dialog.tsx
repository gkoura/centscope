"use client"
import { useId, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Field, FieldLabel } from "@/components/ui/field"
import { groupBudgetTransactions } from "@/lib/budget-transaction-groups"
import type { WorkspaceData } from "@/lib/workspace-data"
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
    scope = "budget",
}: {
    accountId: string
    budgetId: string
    cadence: BudgetCadence
    date: string
    mode: BudgetMode
    onClose: () => void
    scope?: "budget" | "month"
}) {
    const [page, setPage] = useState(0)
    const [grouped, setGrouped] = useState(false)
    const groupedId = useId()
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
    function toggleSection(key: string) {
        setCollapsed((previous) => {
            const next = new Set(previous)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }
    const request = budgetDetailRequest(
        accountId,
        budgetId,
        cadence,
        date,
        mode,
        page
    )
    const result = useWorkspaceQuery("budgetTransactions", accountId, {
        ...request.query,
        ...(scope === "month" ? { scope } : {}),
        ...(grouped ? { grouped: "true" } : {}),
    })
    const data = result.error?.status === 410 ? undefined : result.data
    const groups =
        grouped && data ? groupBudgetTransactions(data.transactions) : []
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
                <Field orientation="horizontal" className="justify-end">
                    <FieldLabel htmlFor={groupedId}>Grouped by Category</FieldLabel>
                    <Switch
                        id={groupedId}
                        checked={grouped}
                        onCheckedChange={(value) => {
                            setGrouped(value)
                            setPage(0)
                            setCollapsed(new Set())
                        }}
                    />
                </Field>
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
                        {grouped && data.count > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11"
                                    onClick={() => setCollapsed(new Set())}
                                >
                                    Expand all
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11"
                                    onClick={() =>
                                        setCollapsed(
                                            new Set(
                                                groups.flatMap((group) => [
                                                    `category:${group.id}`,
                                                    ...group.subgroups.map(
                                                        (subgroup) =>
                                                            `subcategory:${group.id}:${subgroup.id}`
                                                    ),
                                                ])
                                            )
                                        )
                                    }
                                >
                                    Collapse all
                                </Button>
                            </div>
                        )}
                        <div className="min-h-0 overflow-y-auto overscroll-contain">
                            {grouped ? (
                                <div className="flex flex-col gap-3">
                                    {groups.map((group) => (
                                        <details
                                            key={group.id}
                                            open={
                                                !collapsed.has(
                                                    `category:${group.id}`
                                                )
                                            }
                                            className="rounded-lg border"
                                        >
                                            <summary
                                                onClick={(event) => {
                                                    event.preventDefault()
                                                    toggleSection(
                                                        `category:${group.id}`
                                                    )
                                                }}
                                                className="min-h-11 cursor-pointer px-3 py-3 font-medium"
                                            >
                                                <span className="inline-flex max-w-full flex-wrap justify-between gap-x-3 gap-y-1">
                                                    <span>{group.name}</span>
                                                    <span className="tabular-nums">
                                                        {money(
                                                            group.total,
                                                            data.currency
                                                        )}
                                                    </span>
                                                </span>
                                            </summary>
                                            <div className="flex flex-col gap-2 border-t p-3">
                                                {group.subgroups.map(
                                                    (subgroup) => (
                                                        <details
                                                            key={subgroup.id}
                                                            open={
                                                                !collapsed.has(
                                                                    `subcategory:${group.id}:${subgroup.id}`
                                                                )
                                                            }
                                                            className="rounded-lg border"
                                                        >
                                                            <summary
                                                                onClick={(
                                                                    event
                                                                ) => {
                                                                    event.preventDefault()
                                                                    toggleSection(
                                                                        `subcategory:${group.id}:${subgroup.id}`
                                                                    )
                                                                }}
                                                                className="min-h-11 cursor-pointer px-3 py-3 text-sm font-medium"
                                                            >
                                                                <span className="inline-flex max-w-full flex-wrap gap-x-3 gap-y-1">
                                                                    <span>
                                                                        {
                                                                            subgroup.name
                                                                        }{" "}
                                                                        ·{" "}
                                                                        {
                                                                            subgroup
                                                                                .rows
                                                                                .length
                                                                        }
                                                                    </span>
                                                                    <span className="tabular-nums">
                                                                        {money(
                                                                            subgroup.total,
                                                                            data.currency
                                                                        )}
                                                                    </span>
                                                                </span>
                                                            </summary>
                                                            <div className="border-t px-3">
                                                                <BudgetTransactionList
                                                                    rows={
                                                                        subgroup.rows
                                                                    }
                                                                    currency={
                                                                        data.currency
                                                                    }
                                                                />
                                                            </div>
                                                        </details>
                                                    )
                                                )}
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            ) : (
                                <BudgetTransactionList
                                    rows={data.transactions}
                                    currency={data.currency}
                                />
                            )}
                            {!data.count && (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No posted expenses contribute in this
                                    period.
                                </p>
                            )}
                        </div>
                        {!grouped && data.count > data.pageSize && (
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

function BudgetTransactionList({
    rows,
    currency,
}: {
    rows: WorkspaceData["budgetTransactions"]["transactions"]
    currency: string
}) {
    return (
        <ul className="divide-y">
            {rows.map((row) => (
                <li key={row.id} className="grid gap-2 py-4 pr-2">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-medium wrap-break-word">
                                {row.name}
                            </p>
                            <p className="mt-1 text-xs wrap-break-word text-muted-foreground">
                                {row.wallet} · {row.category}
                            </p>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums">
                            {money(row.contribution, currency)}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Paid {row.paidOn} · Original payment{" "}
                        {money(row.originalAmount, currency)}
                    </p>
                    {row.allocations.length > 0 && (
                        <details className="text-xs">
                            <summary className="min-h-8 cursor-pointer py-2 font-medium text-primary">
                                Allocation details
                            </summary>
                            <ul className="flex flex-col gap-2 rounded-lg bg-muted p-3">
                                {row.allocations.map((part) => (
                                    <li key={part.month}>
                                        {part.month}:{" "}
                                        {money(part.contribution, currency)}{" "}
                                        counted here from a{" "}
                                        {money(part.monthlyAmount, currency)}{" "}
                                        monthly share.
                                        <br />
                                        <span className="text-muted-foreground">
                                            {part.from} to {part.until} (end
                                            excluded)
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </li>
            ))}
        </ul>
    )
}
