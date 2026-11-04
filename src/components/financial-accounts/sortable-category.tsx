"use client"
import type { ComponentProps } from "react"
import {
    SortableItem,
    SortableHandle,
} from "@/components/sortable/sortable-item"
export function SortableCategory(
    props: Omit<ComponentProps<typeof SortableItem>, "helpId"> & {
        parentId: string | null
        categoryType: "EXPENSE" | "INCOME"
    }
) {
    return <SortableItem {...props} helpId="category-reorder-help" />
}
export { SortableHandle as CategoryDragHandle }
