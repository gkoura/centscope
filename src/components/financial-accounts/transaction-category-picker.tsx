"use client"

import { useState } from "react"
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
    Popover,
    PopoverContent,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover"

type Category = { id: string; name: string; parentId: string | null }

export function TransactionCategoryPicker({
    categories,
    value,
    onChange,
    error,
}: {
    categories: Category[]
    value: string
    onChange: (id: string) => void
    error?: string
}) {
    const [open, setOpen] = useState(false)
    const [parentId, setParentId] = useState<string | null>(null)
    const selected = categories.find((category) => category.id === value)
    const selectedParent = categories.find(
        (category) => category.id === selected?.parentId
    )
    const parent = categories.find((category) => category.id === parentId)
    const visible = categories.filter(
        (category) => category.parentId === (parent?.id ?? null)
    )
    function choose(id: string) {
        onChange(id)
        setOpen(false)
    }
    return (
        <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="transaction-category">Category</FieldLabel>
            <Popover
                open={open}
                onOpenChange={(next) => {
                    setOpen(next)
                    if (next) setParentId(selected?.parentId ?? null)
                }}
            >
                <PopoverTrigger
                    id="transaction-category"
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                        error ? "transaction-category-error" : undefined
                    }
                    render={
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 w-full justify-between"
                        />
                    }
                >
                    <span className="truncate">
                        {selectedParent
                            ? `${selectedParent.name} / ${selected?.name}`
                            : (selected?.name ?? "Choose a category")}
                    </span>
                    <ChevronDown />
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="max-h-[min(24rem,var(--available-height))] w-(--anchor-width) max-w-[calc(100vw-2rem)] gap-1 overflow-y-auto p-1"
                >
                    <PopoverTitle className="sr-only">
                        Choose a category
                    </PopoverTitle>
                    {parent && (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-11 w-full justify-start"
                                onClick={() => setParentId(null)}
                            >
                                <ChevronLeft data-icon="inline-start" />
                                All categories
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-auto min-h-11 w-full justify-between text-left whitespace-normal"
                                onClick={() => choose(parent.id)}
                            >
                                <span>Use {parent.name}</span>
                                {value === parent.id && <Check />}
                            </Button>
                            <p className="px-3 py-1 text-xs text-muted-foreground">
                                Or choose a subcategory
                            </p>
                        </>
                    )}
                    {visible.map((category) => {
                        const nested =
                            !parent &&
                            categories.some(
                                (child) => child.parentId === category.id
                            )
                        return (
                            <Button
                                key={category.id}
                                type="button"
                                variant="ghost"
                                className="h-auto min-h-11 w-full justify-between text-left whitespace-normal"
                                onClick={() =>
                                    nested
                                        ? setParentId(category.id)
                                        : choose(category.id)
                                }
                            >
                                <span className="min-w-0 break-words">
                                    {category.name}
                                </span>
                                {nested ? (
                                    <ChevronRight />
                                ) : value === category.id ? (
                                    <Check />
                                ) : null}
                            </Button>
                        )
                    })}
                    {!visible.length && !parent && (
                        <p className="p-3 text-sm text-muted-foreground">
                            No categories available.
                        </p>
                    )}
                </PopoverContent>
            </Popover>
            {error && (
                <FieldError id="transaction-category-error">{error}</FieldError>
            )}
        </Field>
    )
}
