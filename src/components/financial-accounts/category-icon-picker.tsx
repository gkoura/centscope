"use client"
import { useId, useState } from "react"
import { categoryIcons, isCategoryIconKey } from "@/lib/category-icons"
import { CategoryIcon } from "./category-icon"
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
} from "@/components/ui/field"
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
} from "@/components/ui/combobox"

export function CategoryIconPicker({
    defaultValue,
    parentIconKey,
    inherits,
    disabled,
    error,
    batch = false,
}: {
    defaultValue?: string | null
    parentIconKey?: string | null
    inherits?: boolean
    disabled?: boolean
    error?: string
    batch?: boolean
}) {
    const id = useId()
    const [value, setValue] = useState(
        isCategoryIconKey(defaultValue) ? defaultValue : ""
    )
    const items = [
        { key: "", label: inherits ? "Use parent icon" : "Default icon" },
        ...categoryIcons,
    ]
    return (
        <Field data-invalid={!!error}>
            <FieldLabel htmlFor={id}>Icon</FieldLabel>
            <input type="hidden" name="iconKey" value={value} />
            <Combobox
                items={items}
                value={items.find((item) => item.key === value) ?? items[0]}
                onValueChange={(item) => {
                    if (item) setValue(item.key)
                }}
                itemToStringLabel={(item) => item.label}
                isItemEqualToValue={(a, b) => a.key === b.key}
                disabled={disabled}
            >
                <ComboboxInput
                    id={id}
                    className="h-11 w-full"
                    aria-invalid={!!error}
                    aria-describedby={`${id}-description${error ? ` ${id}-error` : ""}`}
                    placeholder="Search icons…"
                />
                <ComboboxContent>
                    <ComboboxEmpty>No icons found.</ComboboxEmpty>
                    <ComboboxList>
                        {(item: (typeof items)[number]) => (
                            <ComboboxItem
                                key={item.key}
                                value={item}
                                className="min-h-11"
                            >
                                <CategoryIcon
                                    iconKey={item.key}
                                    parentIconKey={
                                        item.key ? undefined : parentIconKey
                                    }
                                />
                                {item.label}
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
            <FieldDescription
                id={`${id}-description`}
                className="flex items-center gap-2"
            >
                <CategoryIcon iconKey={value} parentIconKey={parentIconKey} />
                {inherits
                    ? "Without an override, this subcategory follows its parent’s icon."
                    : batch
                      ? "Applies to each category created. Icons supplement category names."
                      : "Icons supplement category names."}
            </FieldDescription>
            {error && (
                <FieldError id={`${id}-error`} role="alert">
                    {error}
                </FieldError>
            )}
        </Field>
    )
}
