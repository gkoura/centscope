"use client"

import { useId, useState } from "react"
import { ChevronDown, ChevronRight, ListFilter, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import {
    categoryGroupIds,
    UNCATEGORIZED,
    type TrendCategory,
} from "@/lib/monthly-trends"
import { cn } from "@/lib/utils"

type Props = {
    categories: TrendCategory[]
    selected: string[] | null
    onChange: (ids: string[] | null) => void
}
export function MonthlyTrendFilters({ categories, selected, onChange }: Props) {
    const pickerId = useId()
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState<string[] | null>(null)
    const [search, setSearch] = useState("")
    const [expanded, setExpanded] = useState<string[]>([])
    const allIds = [...categories.map((item) => item.id), UNCATEGORIZED]
    const roots = categories.filter((item) => !item.parentId)
    const term = search.trim().toLocaleLowerCase()
    const matches = (name: string) => name.toLocaleLowerCase().includes(term)
    const visibleRoots = roots.filter(
        (root) =>
            matches(root.name) ||
            categories.some(
                (child) => child.parentId === root.id && matches(child.name)
            )
    )
    const showUncategorized = matches("Uncategorized")
    const selectedCount =
        draft === null
            ? allIds.length
            : allIds.filter((id) => draft.includes(id)).length

    function checked(ids: string[]) {
        const count = ids.filter(
            (id) => draft === null || draft.includes(id)
        ).length
        return {
            checked: count === ids.length,
            indeterminate: count > 0 && count < ids.length,
        }
    }
    function toggle(ids: string[], value: boolean) {
        const next = new Set(draft ?? allIds)
        ids.forEach((id) => (value ? next.add(id) : next.delete(id)))
        setDraft([...next])
    }
    function rowClass(ids: string[]) {
        const selection = checked(ids)
        return cn(
            "flex w-full items-center gap-2 rounded-xl px-3",
            (selection.checked || selection.indeterminate) && "bg-primary/5"
        )
    }
    function choice(label: string, ids: string[], description?: string) {
        const id = `${pickerId}-choice-${ids.join("-")}`
        return (
            <Field orientation="horizontal" className="min-w-0 flex-1">
                <Checkbox
                    id={id}
                    {...checked(ids)}
                    onCheckedChange={(value) => toggle(ids, value)}
                />
                <FieldLabel
                    htmlFor={id}
                    className="min-h-12 min-w-0 flex-1 cursor-pointer gap-3 py-2.5"
                >
                    <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="wrap-break-word">{label}</span>
                        {description && (
                            <span className="text-xs font-normal text-muted-foreground">
                                {description}
                            </span>
                        )}
                    </span>
                </FieldLabel>
            </Field>
        )
    }
    const selectedSet = selected === null ? null : new Set(selected)
    const chips = roots.flatMap((root) => {
        const ids = categoryGroupIds(root, categories)
        if (selectedSet && ids.every((id) => selectedSet.has(id)))
            return [{ label: root.name, ids }]
        return categories
            .filter(
                (item) => ids.includes(item.id) && selectedSet?.has(item.id)
            )
            .map((item) => ({
                label:
                    item.id === root.id
                        ? `${root.name} (direct)`
                        : `${root.name} / ${item.name}`,
                ids: [item.id],
            }))
    })
    if (selectedSet?.has(UNCATEGORIZED))
        chips.push({ label: "Uncategorized", ids: [UNCATEGORIZED] })

    return (
        <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Dialog
                    open={open}
                    onOpenChange={(value) => {
                        if (value) {
                            setDraft(selected)
                            setSearch("")
                            setExpanded([])
                        }
                        setOpen(value)
                    }}
                >
                    <DialogTrigger
                        render={
                            <Button
                                variant="outline"
                                className="min-h-11 gap-2"
                            />
                        }
                    >
                        <ListFilter data-icon="inline-start" /> Categories
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {selected === null ? "All" : chips.length}
                        </span>
                        <ChevronDown data-icon="inline-end" />
                    </DialogTrigger>
                    <DialogContent
                        showCloseButton={false}
                        className="top-auto bottom-0 left-0 h-[min(88dvh,36rem)] max-w-full translate-x-0 translate-y-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0 motion-reduce:animate-none sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
                    >
                        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
                            <div className="flex min-w-0 flex-col gap-2">
                                <DialogTitle>Choose categories</DialogTitle>
                                <DialogDescription>
                                    Select a whole category or pick individual
                                    subcategories.
                                </DialogDescription>
                            </div>
                            <DialogClose
                                render={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="-mt-2 -mr-2 size-11"
                                    />
                                }
                                aria-label="Close category filters"
                            >
                                <X />
                            </DialogClose>
                        </div>
                        <div className="flex flex-col gap-2 border-b px-5 pb-3">
                            <Field>
                                <FieldLabel
                                    htmlFor={`${pickerId}-search`}
                                    className="sr-only"
                                >
                                    Search categories
                                </FieldLabel>
                                <InputGroup className="h-11">
                                    <InputGroupAddon>
                                        <Search aria-hidden="true" />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        id={`${pickerId}-search`}
                                        placeholder="Search categories…"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        className="text-base sm:text-sm"
                                        autoComplete="off"
                                    />
                                </InputGroup>
                            </Field>
                            <div className="flex flex-wrap items-center justify-between gap-x-2">
                                <p
                                    aria-live="polite"
                                    className="text-xs text-muted-foreground"
                                >
                                    {selectedCount === allIds.length
                                        ? "All categories selected"
                                        : `${selectedCount} of ${allIds.length} selected`}
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="min-h-11"
                                        onClick={() => setDraft(null)}
                                    >
                                        Select all
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="min-h-11"
                                        onClick={() => setDraft([])}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="min-h-0 overflow-y-auto overscroll-contain px-3 py-2">
                            {visibleRoots.map((root) => {
                                const children = categories.filter(
                                    (item) => item.parentId === root.id
                                )
                                const visibleChildren =
                                    term && !matches(root.name)
                                        ? children.filter((item) =>
                                              matches(item.name)
                                          )
                                        : children
                                const isExpanded =
                                    !!term || expanded.includes(root.id)
                                return (
                                    <div key={root.id} className="mb-1">
                                        <div
                                            className={rowClass(
                                                categoryGroupIds(
                                                    root,
                                                    categories
                                                )
                                            )}
                                        >
                                            {choice(
                                                root.name,
                                                categoryGroupIds(
                                                    root,
                                                    categories
                                                ),
                                                children.length
                                                    ? `${children.length} subcategories`
                                                    : undefined
                                            )}
                                            {children.length > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-11"
                                                    aria-label={`${isExpanded ? "Hide" : "Show"} ${root.name} subcategories`}
                                                    aria-expanded={isExpanded}
                                                    aria-controls={`${pickerId}-${root.id}`}
                                                    disabled={!!term}
                                                    onClick={() =>
                                                        setExpanded(
                                                            (current) =>
                                                                isExpanded
                                                                    ? current.filter(
                                                                          (
                                                                              id
                                                                          ) =>
                                                                              id !==
                                                                              root.id
                                                                      )
                                                                    : [
                                                                          ...current,
                                                                          root.id,
                                                                      ]
                                                        )
                                                    }
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown />
                                                    ) : (
                                                        <ChevronRight />
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                        {children.length > 0 && isExpanded && (
                                            <div
                                                id={`${pickerId}-${root.id}`}
                                                className="mt-1 mr-3 mb-3 ml-5 flex flex-col gap-1 border-l pl-4"
                                            >
                                                {(!term ||
                                                    matches(root.name)) && (
                                                    <div
                                                        className={rowClass([
                                                            root.id,
                                                        ])}
                                                    >
                                                        {choice(
                                                            `Directly in ${root.name}`,
                                                            [root.id],
                                                            "Entries without a subcategory"
                                                        )}
                                                    </div>
                                                )}
                                                {visibleChildren.map(
                                                    (child) => (
                                                        <div
                                                            key={child.id}
                                                            className={rowClass(
                                                                [child.id]
                                                            )}
                                                        >
                                                            {choice(
                                                                child.name,
                                                                [child.id]
                                                            )}
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {showUncategorized && (
                                <div className="mt-2 border-t pt-2">
                                    <div className={rowClass([UNCATEGORIZED])}>
                                        {choice(
                                            "Uncategorized",
                                            [UNCATEGORIZED],
                                            "Entries with no category"
                                        )}
                                    </div>
                                </div>
                            )}
                            {!visibleRoots.length && !showUncategorized && (
                                <div
                                    role="status"
                                    className="flex flex-col gap-2 px-3 py-10 text-center"
                                >
                                    <p className="font-medium">
                                        No categories found
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Try a category or subcategory name.
                                    </p>
                                    <Button
                                        variant="ghost"
                                        className="mx-auto mt-2 min-h-11"
                                        onClick={() => setSearch("")}
                                    >
                                        Clear search
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3 border-t bg-muted/20 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                            <DialogClose
                                render={
                                    <Button
                                        variant="outline"
                                        className="min-h-11"
                                    />
                                }
                            >
                                Cancel
                            </DialogClose>
                            <Button
                                className="min-h-11 flex-1"
                                onClick={() => {
                                    onChange(
                                        draft === null ||
                                            allIds.every((id) =>
                                                draft.includes(id)
                                            )
                                            ? null
                                            : draft
                                    )
                                    setOpen(false)
                                }}
                            >
                                Apply filters
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
                {selected !== null && (
                    <Button
                        variant="ghost"
                        className="min-h-11"
                        onClick={() => onChange(null)}
                    >
                        Clear filters
                    </Button>
                )}
            </div>
            {selected !== null && (
                <div
                    aria-label="Selected categories"
                    className="flex flex-wrap gap-2"
                >
                    {chips.map((chip) => (
                        <Button
                            key={chip.ids.join(",")}
                            variant="secondary"
                            className="h-auto min-h-11 max-w-full text-left whitespace-normal"
                            onClick={() =>
                                onChange(
                                    selected.filter(
                                        (id) => !chip.ids.includes(id)
                                    )
                                )
                            }
                            aria-label={`Remove ${chip.label} filter`}
                        >
                            <span className="min-w-0 wrap-break-word">
                                {chip.label}
                            </span>
                            <X data-icon="inline-end" />
                        </Button>
                    ))}
                    {selected.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No categories selected. Choose categories or clear
                            filters to see all.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
