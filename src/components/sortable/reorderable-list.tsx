"use client"

import { useId, useRef, useState, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DragDropProvider } from "@dnd-kit/react"
import { isSortable } from "@dnd-kit/react/sortable"
import {
    Accessibility,
    KeyboardSensor,
    PointerSensor,
    PointerActivationConstraints,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
} from "@dnd-kit/dom"
import {
    sameOrder,
    type ListOrderInput,
    type OrderSaveResult,
} from "@/lib/list-order"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { SortableItem } from "./sortable-item"

export function ReorderableList<T extends { id: string; name: string }>({
    items: serverItems,
    label,
    onSave,
    renderItem,
}: {
    items: T[]
    label: string
    onSave: (input: ListOrderInput) => Promise<OrderSaveResult<T>>
    renderItem: (item: T, state: { disabled: boolean }) => ReactNode
}) {
    const router = useRouter()
    const listRef = useRef<HTMLDivElement>(null)
    function focusHandle() {
        requestAnimationFrame(() =>
            listRef.current
                ?.querySelector<HTMLElement>("[data-sortable-handle]")
                ?.focus()
        )
    }
    const helpId = useId()
    const baseline = JSON.stringify(serverItems)
    const [confirmed, setConfirmed] = useState<{
        baseline: string
        items: T[]
    } | null>(null)
    const saved =
        confirmed?.baseline === baseline ? confirmed.items : serverItems
    const [draft, setDraft] = useState<{ original: T[]; items: T[] } | null>(
        null
    )
    const items = draft?.items ?? saved
    const [saving, setSaving] = useState(false)
    const savingRef = useRef(false)
    const [status, setStatus] = useState("")
    const [revision, setRevision] = useState(0)
    const [keyboard, setKeyboard] = useState(false)
    const dirty = draft !== null
    function finishDrag(event: DragEndEvent) {
        const source = event.operation.source
        if (
            event.canceled ||
            !isSortable(source) ||
            source.initialIndex === source.index ||
            source.group !== source.initialGroup ||
            savingRef.current
        )
            return
        const next = [...items]
        const [moved] = next.splice(source.initialIndex, 1)
        if (
            !moved ||
            moved.id !== source.id ||
            source.index < 0 ||
            source.index >= items.length
        )
            return
        next.splice(source.index, 0, moved)
        const original = draft?.original ?? saved
        flushSync(() => {
            setDraft(
                sameOrder(
                    original.map((item) => item.id),
                    next.map((item) => item.id)
                )
                    ? null
                    : { original, items: next }
            )
            setStatus("")
        })
    }
    function cancel() {
        if (savingRef.current) return
        setDraft(null)
        setRevision((value) => value + 1)
        setStatus("Changes canceled")
        focusHandle()
    }
    async function save() {
        if (!draft || savingRef.current) return
        savingRef.current = true
        setSaving(true)
        setStatus("Saving…")
        let message =
            "Couldn’t save the order. Your changes are kept; try again."
        try {
            const result = await onSave({
                previousIds: draft.original.map((item) => item.id),
                orderedIds: draft.items.map((item) => item.id),
            })
            if (!result.success) {
                message = result.message
                throw new Error(message)
            }
            setConfirmed({ baseline, items: result.items })
            setDraft(null)
            setStatus("Order saved")
            focusHandle()
        } catch {
            setStatus(message)
            toast.error(message)
            router.refresh()
        } finally {
            savingRef.current = false
            setSaving(false)
        }
    }
    return (
        <DragDropProvider
            key={revision}
            onDragEnd={finishDrag}
            sensors={[
                PointerSensor.configure({
                    activationConstraints: (event) =>
                        event.pointerType === "touch"
                            ? [
                                  new PointerActivationConstraints.Delay({
                                      value: 250,
                                      tolerance: 5,
                                  }),
                              ]
                            : [
                                  new PointerActivationConstraints.Distance({
                                      value: 5,
                                  }),
                              ],
                }),
                KeyboardSensor,
            ]}
            plugins={(defaults) => [
                ...defaults.filter((plugin) => plugin !== Accessibility),
                Accessibility.configure({
                    screenReaderInstructions: {
                        draggable:
                            "Press Space or Enter to pick up. Use arrow keys to reorder. Press Space or Enter to drop, or Escape to cancel. Save order to keep your changes.",
                    },
                    announcements: {
                        dragstart: ({ operation }: DragStartEvent) =>
                            `Picked up ${operation.source?.data.name}.`,
                        dragover: ({ operation }: DragOverEvent) =>
                            isSortable(operation.source)
                                ? `${operation.source.data.name}, position ${operation.source.index + 1}.`
                                : undefined,
                        dragend: ({ operation, canceled }: DragEndEvent) =>
                            canceled
                                ? "Reordering canceled."
                                : `Dropped ${operation.source?.data.name}.`,
                    },
                }),
            ]}
        >
            <div
                ref={listRef}
                className="flex min-w-0 flex-col gap-4"
                onKeyDownCapture={() => setKeyboard(true)}
                onPointerDownCapture={() => setKeyboard(false)}
            >
                {items.length > 1 && (
                    <p id={helpId} className="text-xs text-muted-foreground">
                        Drag the grip to reorder your {label}, then save your
                        changes.
                    </p>
                )}
                {dirty && (
                    <section
                        aria-label={`Unsaved ${label} order`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted p-4"
                    >
                        <p className="text-sm font-medium">
                            Unsaved {label} order
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                disabled={saving}
                                onClick={cancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                disabled={saving}
                                onClick={() => void save()}
                            >
                                {saving && <Spinner data-icon="inline-start" />}
                                {saving ? "Saving…" : "Save order"}
                            </Button>
                        </div>
                    </section>
                )}
                <p
                    role="status"
                    aria-live="polite"
                    className="text-xs text-muted-foreground empty:hidden"
                >
                    {status}
                </p>
                <ul
                    aria-label={label}
                    className="grid min-w-0 gap-4 sm:grid-cols-2"
                >
                    {items.map((item, index) => (
                        <SortableItem
                            key={item.id}
                            id={item.id}
                            name={item.name}
                            index={index}
                            group={helpId}
                            helpId={items.length > 1 ? helpId : undefined}
                            disabled={saving || items.length < 2}
                            keyboard={keyboard}
                            className="min-w-0"
                        >
                            {renderItem(item, { disabled: dirty || saving })}
                        </SortableItem>
                    ))}
                </ul>
            </div>
        </DragDropProvider>
    )
}
