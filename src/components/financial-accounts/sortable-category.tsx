"use client"

import {
    createContext,
    useContext,
    useSyncExternalStore,
    type ReactNode,
} from "react"
import { Feedback } from "@dnd-kit/dom"
import { useSortable } from "@dnd-kit/react/sortable"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

const HandleRefContext = createContext<
    ((element: Element | null) => void) | null
>(null)
const HandleContext = createContext<{
    disabled: boolean
    id: string
    name: string
} | null>(null)
function subscribeMotion(callback: () => void) {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    media.addEventListener("change", callback)
    return () => media.removeEventListener("change", callback)
}
const motionSnapshot = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
const serverMotionSnapshot = () => false

export function SortableCategory({
    id,
    name,
    index,
    group,
    parentId,
    categoryType,
    disabled,
    keyboard,
    className,
    children,
}: {
    id: string
    name: string
    index: number
    group: string
    parentId: string | null
    categoryType: "EXPENSE" | "INCOME"
    disabled: boolean
    keyboard: boolean
    className?: string
    children: ReactNode
}) {
    const reduced = useSyncExternalStore(
        subscribeMotion,
        motionSnapshot,
        serverMotionSnapshot
    )
    const { ref, handleRef, isDragSource, isDropTarget } = useSortable({
        id,
        index,
        group,
        type: group,
        accept: group,
        disabled,
        data: { name, parentId, categoryType },
        plugins: (defaults) => [
            ...defaults,
            Feedback.configure({
                dropAnimation:
                    reduced || keyboard
                        ? null
                        : {
                              duration: 160,
                              easing: "cubic-bezier(0.23, 1, 0.32, 1)",
                          },
                keyboardTransition: null,
            }),
        ],
        transition:
            reduced || keyboard
                ? null
                : {
                      duration: 160,
                      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
                      idle: false,
                  },
    })
    return (
        <li
            ref={ref}
            className={cn(
                className,
                isDragSource && "relative shadow-xl ring-2 ring-primary/50",
                isDropTarget && !isDragSource && "ring-2 ring-primary/40"
            )}
        >
            <HandleRefContext value={handleRef}>
                <HandleContext value={{ disabled, id, name }}>
                    {children}
                </HandleContext>
            </HandleRefContext>
        </li>
    )
}

export function CategoryDragHandle() {
    const handleRef = useContext(HandleRefContext)
    const handle = useContext(HandleContext)
    if (!handle) return null
    return (
        <button
            ref={handleRef}
            type="button"
            data-category-drag-handle={handle.id}
            disabled={handle.disabled}
            aria-label={`Reorder ${handle.name}`}
            aria-describedby="category-reorder-help"
            title="Drag to reorder"
            className="pointer-events-auto relative flex size-9 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring enabled:cursor-grab enabled:active:cursor-grabbing disabled:cursor-default disabled:opacity-35"
        >
            <GripVertical className="size-4" aria-hidden="true" />
        </button>
    )
}
