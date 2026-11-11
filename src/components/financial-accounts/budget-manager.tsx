"use client"
import { CategoryMultiSelect } from "./category-multi-select"
import { ALL_CATEGORIES } from "@/lib/category-selection"

import { useActionState, useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Plus, Target } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldHelp } from "@/components/ui/field-help"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { BudgetPeriodPicker } from "./budget-period-picker"
import { ReorderableList } from "@/components/sortable/reorderable-list"
import { SortableHandle } from "@/components/sortable/sortable-item"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    reorderBudgetCadences,
    reorderBudgets,
} from "@/app/dashboard/accounts/[id]/budgets/actions"
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from "@/components/ui/collapsible"
import { BudgetTransactionsDialog } from "./budget-transactions-dialog"
import { useBudgetPrefetch } from "./budget-prefetch"
import type { BudgetMode } from "@/lib/budget-contribution"
import { BudgetCard, type Budget } from "./budget-card"
import {
    budgetCadences,
    budgetCadenceLabels,
    budgetPeriod,
    budgetPeriodKey,
    validBudgetDay,
    type BudgetCadence,
} from "@/lib/budget-period"
import { MoneyInput } from "./money-input"
import {
    useWorkspaceDay,
    useWorkspaceQuery,
} from "@/components/workspace/use-workspace-query"
import { WorkspaceQueryState } from "@/components/workspace/workspace-query-state"
import { mutateBudget } from "@/app/dashboard/accounts/[id]/budgets/actions"
import { type BudgetState } from "@/lib/budget-input"
import { currencyOptions, currencySymbol } from "@/lib/currency"
import type { WorkspaceData } from "@/lib/workspace-data"

type Category = WorkspaceData["reference"]["categories"][number]
const initialState: BudgetState = {}

function BudgetForm({
    accountId,
    defaultCadence,
    budget,
    categories,
    defaultCurrency,
    onSaved,
}: {
    accountId: string
    defaultCadence: BudgetCadence
    budget?: Budget
    categories: Category[]
    defaultCurrency: string
    onSaved: () => void
}) {
    const [state, action, pending] = useActionState(mutateBudget, initialState)
    const [recurrence, setRecurrence] = useState<BudgetCadence>(
        budget?.recurrence ?? defaultCadence
    )
    const [categorySelection, setCategorySelection] = useState(
        budget?.categorySelection ?? ALL_CATEGORIES
    )
    const [amount, setAmount] = useState(budget?.spendingLimit ?? "")
    const [currency, setCurrency] = useState(
        budget?.currency ?? defaultCurrency
    )
    useEffect(() => {
        if (state.success) {
            toast.success(budget ? "Budget updated" : "Budget created")
            onSaved()
        }
    }, [state, budget, onSaved])
    const choices = categories
        .filter((c) => c.type === "EXPENSE")
        .map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }))
    for (const category of budget?.selectedCategories ?? [])
        if (!choices.some((c) => c.id === category.id)) choices.push(category)
    return (
        <form action={action} className="grid gap-4">
            <input type="hidden" name="operation" value="save" />
            <input type="hidden" name="financialAccountId" value={accountId} />
            <input type="hidden" name="id" value={budget?.id ?? ""} />
            <input type="hidden" name="version" value={budget?.version ?? ""} />
            <fieldset disabled={pending} className="grid min-w-0 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="budget-recurrence">Repeats</Label>
                    <NativeSelect
                        id="budget-recurrence"
                        name="recurrence"
                        value={recurrence}
                        onChange={(e) =>
                            setRecurrence(e.target.value as BudgetCadence)
                        }
                        className="w-full [&>select]:h-11"
                    >
                        {budgetCadences.map((c) => (
                            <NativeSelectOption key={c} value={c}>
                                {budgetCadenceLabels[c]}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="budget-name">Name</Label>
                    <Input
                        id="budget-name"
                        name="name"
                        required
                        maxLength={80}
                        defaultValue={budget?.name}
                        placeholder="e.g. Everyday spending"
                        className="h-11"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="budget-category">Spending to track</Label>
                    <CategoryMultiSelect
                        id="budget-category"
                        name="categorySelection"
                        label="Spending to track"
                        resetLabel="All expenses"
                        categories={choices}
                        value={categorySelection}
                        onChange={setCategorySelection}
                        allowEmpty={false}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="budget-currency">Currency</Label>
                    <NativeSelect
                        id="budget-currency"
                        name="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full [&>select]:h-11"
                    >
                        {currencyOptions.map((c) => (
                            <NativeSelectOption key={c.value} value={c.value}>
                                {c.label}
                            </NativeSelectOption>
                        ))}
                    </NativeSelect>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="budget-limit">
                        {budgetCadenceLabels[recurrence]} limit (
                        {currencySymbol(currency)})
                    </Label>
                    <MoneyInput
                        id="budget-limit"
                        name="spendingLimit"
                        value={amount}
                        onValueChange={setAmount}
                        required
                        placeholder="0.00"
                    />
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                    Only posted expenses in {currency} count, on their
                    transaction date. The limit resets each{" "}
                    {recurrence === "DAILY"
                        ? "day"
                        : recurrence === "WEEKLY"
                          ? "week (Monday–Sunday)"
                          : recurrence === "MONTHLY"
                            ? "calendar month"
                            : "calendar year"}
                    . You can browse past and future periods. Changes to this
                    plan apply to every period.
                </p>
                {state.message && (
                    <p role="alert" className="text-sm text-destructive">
                        {state.message}
                    </p>
                )}
                <Button type="submit" className="min-h-11">
                    {pending
                        ? "Saving…"
                        : budget
                          ? "Save changes"
                          : "Create budget"}
                </Button>
            </fieldset>
        </form>
    )
}

function BudgetDelete({
    budget,
    accountId,
    onSaved,
}: {
    budget: Budget
    accountId: string
    onSaved: () => void
}) {
    const [state, action, pending] = useActionState(mutateBudget, initialState)
    useEffect(() => {
        if (state.success) {
            toast.success("Budget removed")
            onSaved()
        }
    }, [state, onSaved])
    return (
        <form action={action} className="grid gap-4">
            <input type="hidden" name="operation" value="delete" />
            <input type="hidden" name="financialAccountId" value={accountId} />
            <input type="hidden" name="id" value={budget.id} />
            <input type="hidden" name="version" value={budget.version} />
            {state.message && (
                <p role="alert" className="text-sm text-destructive">
                    {state.message}
                </p>
            )}
            <Button
                variant="destructive"
                type="submit"
                disabled={pending}
                className="min-h-11"
            >
                {pending ? "Removing…" : "Remove budget"}
            </Button>
        </form>
    )
}

function BudgetSection({
    accountId,
    cadence,
    date,
    mode,
    onChange,
    onEdit,
    onDelete,
    onAdd,
    disabled,
    onOrderDirty,
    dragging,
    expanded,
    onExpandedChange,
}: {
    accountId: string
    cadence: BudgetCadence
    date: string
    mode: BudgetMode
    onChange: (date: string) => void
    onEdit: (budget: Budget) => void
    onDelete: (budget: Budget) => void
    onAdd: () => void
    disabled: boolean
    dragging: boolean
    expanded: boolean
    onExpandedChange: (cadence: BudgetCadence, expanded: boolean) => void
    onOrderDirty: (cadence: BudgetCadence, dirty: boolean) => void
}) {
    const result = useWorkspaceQuery("budgets", accountId, {
        cadence,
        date,
        mode,
    })
    const open = expanded && !dragging
    const [selected, setSelected] = useState<Budget | null>(null)
    const [orderDirty, setOrderDirty] = useState(false)
    const changed = useCallback(
        (dirty: boolean) => {
            setOrderDirty(dirty)
            onOrderDirty(cadence, dirty)
        },
        [onOrderDirty, cadence]
    )
    const prefetch = useBudgetPrefetch(
        accountId,
        result.data?.budgets.map((b) => b.id) ?? [],
        cadence,
        date,
        mode
    )
    return (
        <Collapsible
            open={open}
            onOpenChange={(next) => {
                if (!dragging) onExpandedChange(cadence, next)
            }}
            render={<section aria-labelledby={`budgets-${cadence}`} />}
            className="min-w-0"
        >
            <div className="flex items-center gap-2 rounded-xl border border-s-4 border-primary/20 border-s-primary bg-primary/10 p-2 shadow-sm sm:px-3">
                <SortableHandle />
                <h2 id={`budgets-${cadence}`} className="min-w-0 flex-1">
                    <CollapsibleTrigger
                        disabled={dragging}
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-base font-bold tracking-tight text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring sm:text-lg"
                    >
                        <span>{budgetCadenceLabels[cadence]} budgets</span>
                        <ChevronDown
                            aria-hidden="true"
                            className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                        />
                    </CollapsibleTrigger>
                </h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    disabled={disabled || orderDirty}
                    aria-label={`Add ${cadence.toLowerCase()} budget`}
                    onClick={onAdd}
                >
                    <Plus className="size-4" />
                </Button>
            </div>
            <CollapsibleContent keepMounted className="data-closed:hidden">
                <div className="grid min-w-0 gap-4 pt-4">
                    <fieldset disabled={disabled || orderDirty}>
                        <BudgetPeriodPicker
                            cadence={cadence}
                            value={date}
                            onChange={onChange}
                        />
                    </fieldset>
                    {!result.data ? (
                        <WorkspaceQueryState
                            queries={[result]}
                            label={`Loading ${cadence.toLowerCase()} budgets…`}
                        />
                    ) : (
                        <>
                            {result.error && (
                                <p
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    Couldn’t refresh this period. Showing the
                                    last loaded values.
                                </p>
                            )}
                            <ReorderableList
                                key={`${accountId}-${cadence}-${budgetPeriod(cadence, date).from}-${mode}`}
                                disabled={disabled}
                                label={`${budgetCadenceLabels[cadence].toLowerCase()} budgets`}
                                layout="list"
                                showInstructions={false}
                                items={result.data.budgets}
                                onDirtyChange={changed}
                                onSave={(input) =>
                                    reorderBudgets(
                                        accountId,
                                        cadence,
                                        date,
                                        mode,
                                        input
                                    )
                                }
                                renderItem={(budget, state) => (
                                    <BudgetCard
                                        budget={budget}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onView={setSelected}
                                        onPrefetch={() => prefetch(budget.id)}
                                        handle={<SortableHandle />}
                                        disabled={disabled || state.disabled}
                                    />
                                )}
                            />
                        </>
                    )}
                </div>
            </CollapsibleContent>
            {selected && (
                <BudgetTransactionsDialog
                    key={`${selected.id}-${date}-${mode}`}
                    accountId={accountId}
                    budgetId={selected.id}
                    cadence={cadence}
                    date={date}
                    mode={mode}
                    onClose={() => setSelected(null)}
                />
            )}
        </Collapsible>
    )
}
export function BudgetManager({
    accountId,
    requestedPeriods,
}: {
    accountId: string
    requestedPeriods: Record<string, string>
}) {
    const today = useWorkspaceDay() || "2000-01-01"
    const reference = useWorkspaceQuery("reference", accountId)
    const inventory = useWorkspaceQuery("budgetInventory", accountId)
    const router = useRouter(),
        query = useSearchParams()
    const [editor, setEditor] = useState<{
        budget?: Budget
        cadence: BudgetCadence
    } | null>(null)
    const [deleting, setDeleting] = useState<Budget | null>(null)
    const [collapsedSections, setCollapsedSections] = useState<
        Record<string, boolean>
    >({})
    const onExpandedChange = useCallback(
        (cadence: BudgetCadence, expanded: boolean) => {
            setCollapsedSections((previous) => ({
                ...previous,
                [`${accountId}-${cadence}`]: !expanded,
            }))
        },
        [accountId]
    )
    const [rootDirty, setRootDirty] = useState(false)
    const [sectionDirty, setSectionDirty] = useState<Record<string, boolean>>(
        {}
    )
    const onOrderDirty = useCallback(
        (cadence: BudgetCadence, dirty: boolean) =>
            setSectionDirty((previous) =>
                previous[cadence] === dirty
                    ? previous
                    : { ...previous, [cadence]: dirty }
            ),
        []
    )
    const mode: BudgetMode =
        requestedPeriods.mode === "smoothed" ? "smoothed" : "actual"
    const dirty = rootDirty || Object.values(sectionDirty).some(Boolean)
    if (!reference.data || !inventory.data)
        return (
            <WorkspaceQueryState
                queries={[reference, inventory]}
                label="Loading budgets…"
            />
        )
    const groups = inventory.data.groups
    function changePeriod(cadence: BudgetCadence, date: string) {
        const next = new URLSearchParams(query.toString())
        next.set(budgetPeriodKey(cadence), budgetPeriod(cadence, date).from)
        router.replace(`/dashboard/accounts/${accountId}/budgets?${next}`, {
            scroll: false,
        })
    }
    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <fieldset disabled={dirty}>
                        <Tabs
                            value={mode}
                            onValueChange={(value) => {
                                if (value !== "actual" && value !== "smoothed")
                                    return
                                const next = new URLSearchParams(
                                    query.toString()
                                )
                                next.set("mode", value)
                                router.replace(
                                    `/dashboard/accounts/${accountId}/budgets?${next}`,
                                    { scroll: false }
                                )
                            }}
                        >
                            <TabsList>
                                <TabsTrigger value="actual">Actual</TabsTrigger>
                                <TabsTrigger value="smoothed">
                                    Smoothed
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </fieldset>
                    <FieldHelp label="Budgets">
                        <span className="block">
                            Posted expenses only · Currencies tracked separately
                            · Each budget is evaluated independently.
                        </span>
                        <span className="mt-3 block">
                            {mode === "smoothed"
                                ? "Spread expenses count in their allocated periods; partial months are shared by day."
                                : "Expenses count on their payment date."}
                        </span>
                        <span className="mt-3 block">
                            Drag the grip to reorder your budget periods, then
                            save your changes.
                        </span>
                    </FieldHelp>
                </div>
                <Button
                    className="min-h-11 w-full sm:w-auto"
                    disabled={dirty}
                    onClick={() => setEditor({ cadence: "MONTHLY" })}
                >
                    <Plus className="size-4" />
                    Add budget
                </Button>
            </div>
            {!groups.length ? (
                <div className="grid justify-items-center gap-4 rounded-2xl border border-dashed px-5 py-10 text-center">
                    <Target
                        className="size-8 text-primary"
                        aria-hidden="true"
                    />
                    <h2 className="font-semibold">
                        One plan. A fresh start every period.
                    </h2>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        Create a recurring spending limit, then move between
                        periods to see how you did.
                    </p>
                    <Button
                        variant="outline"
                        className="min-h-11"
                        onClick={() => setEditor({ cadence: "MONTHLY" })}
                    >
                        Create your first budget
                    </Button>
                </div>
            ) : (
                <ReorderableList
                    key={accountId}
                    items={groups}
                    disabled={Object.values(sectionDirty).some(Boolean)}
                    label="budget periods"
                    layout="list"
                    showInstructions={false}
                    onDirtyChange={setRootDirty}
                    onSave={(input) => reorderBudgetCadences(accountId, input)}
                    renderItem={(group, state) => {
                        const cadence = group.id
                        const value = requestedPeriods[budgetPeriodKey(cadence)]
                        const date = validBudgetDay(value ?? "") ? value : today
                        return (
                            <BudgetSection
                                accountId={accountId}
                                cadence={cadence}
                                date={date}
                                mode={mode}
                                disabled={state.disabled}
                                dragging={state.dragging}
                                expanded={
                                    !collapsedSections[
                                        `${accountId}-${cadence}`
                                    ]
                                }
                                onExpandedChange={onExpandedChange}
                                onOrderDirty={onOrderDirty}
                                onChange={(value) =>
                                    changePeriod(cadence, value)
                                }
                                onAdd={() => setEditor({ cadence })}
                                onEdit={(budget) =>
                                    setEditor({
                                        budget,
                                        cadence: budget.recurrence,
                                    })
                                }
                                onDelete={setDeleting}
                            />
                        )
                    }}
                />
            )}

            <Dialog
                open={!!editor}
                onOpenChange={(open) => {
                    if (!open) setEditor(null)
                }}
            >
                <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editor?.budget ? "Edit budget" : "New budget"}
                        </DialogTitle>
                        <DialogDescription>
                            Create once, then compare your spending across
                            periods.
                        </DialogDescription>
                    </DialogHeader>
                    {editor && (
                        <BudgetForm
                            accountId={accountId}
                            defaultCadence={editor.cadence}
                            budget={editor.budget}
                            categories={reference.data.categories}
                            defaultCurrency={
                                reference.data.account.reportingCurrency
                            }
                            onSaved={() => setEditor(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!deleting}
                onOpenChange={(open) => {
                    if (!open) setDeleting(null)
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove {deleting?.name}?</DialogTitle>
                        <DialogDescription>
                            This removes the recurring plan from all periods.
                            Your transactions stay as they are.
                        </DialogDescription>
                    </DialogHeader>
                    {deleting && (
                        <BudgetDelete
                            accountId={accountId}
                            budget={deleting}
                            onSaved={() => setDeleting(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
