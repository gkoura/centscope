"use client"

import { flushSync } from "react-dom"
import { toast } from "sonner"
import { useCallback, useState, useRef } from "react"
import {
    ArrowDownLeft,
    ArrowUpRight,
    CornerDownRight,
    Layers,
    Plus,
    Search,
    X,
} from "lucide-react"
import {
    CategoryEditor,
    CreateCategoryForm,
    type CategoryChoice,
} from "./category-forms"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    InputGroup,
    InputGroupInput,
    InputGroupAddon,
    InputGroupButton,
} from "@/components/ui/input-group"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Empty,
    EmptyHeader,
    EmptyTitle,
    EmptyDescription,
    EmptyMedia,
    EmptyContent,
} from "@/components/ui/empty"
import { useRouter } from "next/navigation"
import { DragDropProvider } from "@dnd-kit/react"
import { isSortable } from "@dnd-kit/react/sortable"
import {
    Accessibility,
    PointerSensor,
    KeyboardSensor,
    PointerActivationConstraints,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
} from "@dnd-kit/dom"
import { reorderCategories } from "@/app/dashboard/accounts/[id]/categories/actions"
import { categoryOrderChanges } from "@/lib/category-input"
import { SortableCategory, CategoryDragHandle } from "./sortable-category"

type Category = CategoryChoice & { updatedAt: string }
type CategoryType = Category["type"]

export function CategoryManager({
    financialAccountId,
    categories: serverCategories,
}: {
    financialAccountId: string
    categories: Category[]
}) {
    const router = useRouter()
    const baseline = JSON.stringify(serverCategories)
    const [draft, setDraft] = useState<{
        original: Category[]
        categories: Category[]
    } | null>(null)
    const [confirmed, setConfirmed] = useState<{
        baseline: string
        categories: Category[]
    } | null>(null)
    const savedCategories =
        confirmed?.baseline === baseline
            ? confirmed.categories
            : serverCategories
    const categories = draft?.categories ?? savedCategories
    const changes = draft
        ? categoryOrderChanges(draft.original, draft.categories)
        : []
    const dirty = changes.length > 0
    const [saving, setSaving] = useState(false)
    const savingRef = useRef(false)
    const [orderStatus, setOrderStatus] = useState("")
    const [listRevision, setListRevision] = useState(0)
    const [keyboard, setKeyboard] = useState(false)
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
        const category = categories.find((c) => c.id === source.id)
        if (!category) return
        const siblings = categories.filter(
            (c) => c.type === category.type && c.parentId === category.parentId
        )
        const previousIds = siblings.map((c) => c.id)
        const orderedIds = [...previousIds]
        const [moved] = orderedIds.splice(source.initialIndex, 1)
        if (!moved || source.index < 0 || source.index >= siblings.length)
            return
        orderedIds.splice(source.index, 0, moved)
        const byId = new Map(siblings.map((c) => [c.id, c]))
        let nextIndex = 0
        const nextCategories = categories.map((c) =>
            c.type === category.type && c.parentId === category.parentId
                ? byId.get(orderedIds[nextIndex++])!
                : c
        )
        const original = draft?.original ?? savedCategories
        // Commit the draft immediately; dropping never waits on the network.
        flushSync(() => {
            setDraft(
                categoryOrderChanges(original, nextCategories).length
                    ? { original, categories: nextCategories }
                    : null
            )
            setOrderStatus("")
        })
    }
    function cancelOrder() {
        if (savingRef.current) return
        setDraft(null)
        // Reset the drag library's optimistic DOM as well as the React draft.
        setListRevision((revision) => revision + 1)
        setOrderStatus("Changes canceled")
        requestAnimationFrame(() =>
            document
                .querySelector<HTMLElement>("[data-sortable-handle]")
                ?.focus()
        )
    }
    async function saveOrder() {
        if (!dirty || savingRef.current) return
        savingRef.current = true
        setSaving(true)
        setOrderStatus("Saving…")
        let failureMessage =
            "Couldn’t save the order. Your changes are kept; try again."
        try {
            const result = await reorderCategories({
                financialAccountId,
                groups: changes,
            })
            if (!result.success) {
                failureMessage = result.message
                throw new Error(failureMessage)
            }
            setConfirmed({ baseline, categories: result.categories })
            setDraft(null)
            setOrderStatus("Order saved")
        } catch {
            setOrderStatus(failureMessage)
            toast.error(failureMessage)
            router.refresh()
        } finally {
            savingRef.current = false
            setSaving(false)
        }
    }
    const [type, setType] = useState<CategoryType>("EXPENSE")
    const [query, setQuery] = useState("")
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [creating, setCreating] = useState<{
        type: CategoryType
        parentId?: string
    } | null>(null)
    const closeCreation = useCallback((createdType: CategoryType) => {
        setType(createdType)
        toast.success("Category created")
        setCreating(null)
        setQuery("")
    }, [])
    const search = query.trim().toLocaleLowerCase()
    const roots = categories.filter((c) => !c.parentId)
    const children = new Map<string, Category[]>()
    for (const category of categories) {
        if (category.parentId)
            children.set(category.parentId, [
                ...(children.get(category.parentId) ?? []),
                category,
            ])
    }
    const matches = (c: Category) => c.name.toLocaleLowerCase().includes(search)
    const visible = roots.filter(
        (c) =>
            c.type === type && (matches(c) || children.get(c.id)?.some(matches))
    )
    const currentRoots = roots.filter((c) => c.type === type)
    const expandableRoots = currentRoots.filter((c) => children.has(c.id))
    const allCollapsed = expandableRoots.every((c) => !expandedIds.has(c.id))
    function toggle(id: string) {
        setExpandedIds((previous) => {
            const next = new Set(previous)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    return (
        <DragDropProvider
            key={`${type}-${listRevision}`}
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
                            "Press Space or Enter to pick up. Use arrow keys to reorder within this group. Press Space or Enter to drop, or Escape to cancel.",
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
            onDragEnd={finishDrag}
        >
            <div
                className="flex flex-col gap-6"
                onKeyDownCapture={() => setKeyboard(true)}
                onPointerDownCapture={() => setKeyboard(false)}
            >
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5">
                    <div className="flex items-center gap-4">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Layers className="size-5" />
                        </span>
                        <div>
                            <p className="font-medium">
                                Your categories, your way
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {roots.length} categories ·{" "}
                                {categories.length - roots.length} subcategories
                            </p>
                        </div>
                    </div>
                    <Button
                        size="lg"
                        disabled={dirty || saving}
                        onClick={() => setCreating({ type })}
                    >
                        <Plus data-icon="inline-start" />
                        New category
                    </Button>
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                    <p id="category-reorder-help">
                        {search
                            ? "Clear search to reorder categories."
                            : "Drag to reorder, then save your changes. Use Space and arrow keys with a keyboard."}
                    </p>
                    <p role="status" aria-live="polite">
                        {orderStatus}
                    </p>
                </div>
                {dirty && (
                    <section
                        aria-label="Unsaved category order"
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted p-4"
                    >
                        <div>
                            <p className="text-sm font-medium">
                                Unsaved category order
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Save or cancel your order before adding or
                                editing categories.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                disabled={saving}
                                onClick={cancelOrder}
                            >
                                Cancel
                            </Button>
                            <Button
                                disabled={saving}
                                onClick={() => void saveOrder()}
                            >
                                {saving ? "Saving…" : "Save order"}
                            </Button>
                        </div>
                    </section>
                )}
                <Tabs
                    value={type}
                    onValueChange={(value) => setType(value as CategoryType)}
                    className="gap-5"
                >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <TabsList aria-label="Category type">
                            <TabsTrigger value="EXPENSE">
                                <ArrowUpRight data-icon="inline-start" />
                                Expenses{" "}
                                <Badge variant="secondary">
                                    {
                                        categories.filter(
                                            (c) => c.type === "EXPENSE"
                                        ).length
                                    }
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="INCOME">
                                <ArrowDownLeft data-icon="inline-start" />
                                Income{" "}
                                <Badge variant="secondary">
                                    {
                                        categories.filter(
                                            (c) => c.type === "INCOME"
                                        ).length
                                    }
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                        <div className="w-full sm:max-w-xs">
                            <InputGroup>
                                <InputGroupAddon>
                                    <Search aria-hidden="true" />
                                </InputGroupAddon>
                                <InputGroupInput
                                    aria-label="Search categories"
                                    placeholder="Search categories…"
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                />
                                {query && (
                                    <InputGroupAddon align="inline-end">
                                        <InputGroupButton
                                            aria-label="Clear search"
                                            size="icon-xs"
                                            onClick={() => setQuery("")}
                                        >
                                            <X />
                                        </InputGroupButton>
                                    </InputGroupAddon>
                                )}
                            </InputGroup>
                        </div>
                    </div>
                    {(["EXPENSE", "INCOME"] as const).map((tab) => (
                        <TabsContent key={tab} value={tab}>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <p
                                    role="status"
                                    className="text-xs text-muted-foreground"
                                >
                                    {visible.length}{" "}
                                    {visible.length === 1
                                        ? "category"
                                        : "categories"}
                                    {search
                                        ? " matching your search"
                                        : ` for ${type === "EXPENSE" ? "money out" : "money in"}`}
                                </p>
                                {!search && expandableRoots.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setExpandedIds((previous) => {
                                                const next = new Set(previous)
                                                for (const root of expandableRoots) {
                                                    if (allCollapsed)
                                                        next.add(root.id)
                                                    else next.delete(root.id)
                                                }
                                                return next
                                            })
                                        }
                                    >
                                        <Layers
                                            data-icon="inline-start"
                                            aria-hidden="true"
                                        />
                                        {allCollapsed
                                            ? "Expand all"
                                            : "Collapse all"}
                                    </Button>
                                )}
                            </div>
                            {visible.length ? (
                                <ul
                                    key={listRevision}
                                    className="flex flex-col gap-3"
                                >
                                    {visible.map((root, index) => {
                                        const allChildren =
                                            children.get(root.id) ?? []
                                        const shownChildren =
                                            search && !matches(root)
                                                ? allChildren.filter(matches)
                                                : allChildren
                                        const expanded =
                                            Boolean(search) ||
                                            expandedIds.has(root.id)
                                        return (
                                            <SortableCategory
                                                key={root.id}
                                                id={root.id}
                                                name={root.name}
                                                index={index}
                                                group={`root-${root.type}`}
                                                categoryType={root.type}
                                                parentId={null}
                                                disabled={
                                                    Boolean(search) ||
                                                    saving ||
                                                    currentRoots.length < 2
                                                }
                                                keyboard={keyboard}
                                                className="overflow-hidden rounded-xl border bg-card"
                                            >
                                                <div className="relative flex flex-wrap items-center justify-between gap-3 p-4">
                                                    {allChildren.length > 0 && (
                                                        <button
                                                            type="button"
                                                            className="absolute inset-0 rounded-xl outline-none hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-default disabled:hover:bg-transparent"
                                                            aria-label={`${expanded ? "Collapse" : "Expand"} ${root.name}`}
                                                            aria-expanded={
                                                                expanded
                                                            }
                                                            aria-controls={`children-${root.id}`}
                                                            disabled={Boolean(
                                                                search
                                                            )}
                                                            onClick={() =>
                                                                toggle(root.id)
                                                            }
                                                        />
                                                    )}
                                                    <div className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-3">
                                                        <CategoryDragHandle />
                                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                                                            {type ===
                                                            "EXPENSE" ? (
                                                                <ArrowUpRight className="size-4" />
                                                            ) : (
                                                                <ArrowDownLeft className="size-4" />
                                                            )}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <h3 className="text-sm font-medium wrap-break-word">
                                                                {root.name}
                                                            </h3>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {allChildren.length
                                                                    ? `${allChildren.length} ${allChildren.length === 1 ? "subcategory" : "subcategories"}`
                                                                    : "Top-level category"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="pointer-events-none relative flex items-center gap-1 [&_button]:pointer-events-auto">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                setCreating({
                                                                    type: root.type,
                                                                    parentId:
                                                                        root.id,
                                                                })
                                                            }
                                                            disabled={
                                                                dirty || saving
                                                            }
                                                            aria-label={`Add subcategory to ${root.name}`}
                                                        >
                                                            <Plus data-icon="inline-start" />
                                                            <span className="hidden sm:inline">
                                                                Subcategory
                                                            </span>
                                                        </Button>
                                                        <CategoryEditor
                                                            disabled={
                                                                dirty || saving
                                                            }
                                                            key={root.updatedAt}
                                                            financialAccountId={
                                                                financialAccountId
                                                            }
                                                            category={root}
                                                        />
                                                    </div>
                                                </div>
                                                {allChildren.length > 0 && (
                                                    <ul
                                                        id={`children-${root.id}`}
                                                        hidden={!expanded}
                                                        className="border-t bg-muted/20"
                                                    >
                                                        {shownChildren.map(
                                                            (
                                                                child,
                                                                childIndex
                                                            ) => (
                                                                <SortableCategory
                                                                    key={
                                                                        child.id
                                                                    }
                                                                    id={
                                                                        child.id
                                                                    }
                                                                    name={
                                                                        child.name
                                                                    }
                                                                    index={
                                                                        childIndex
                                                                    }
                                                                    group={`children-${root.id}`}
                                                                    categoryType={
                                                                        child.type
                                                                    }
                                                                    parentId={
                                                                        root.id
                                                                    }
                                                                    disabled={
                                                                        Boolean(
                                                                            search
                                                                        ) ||
                                                                        saving ||
                                                                        allChildren.length <
                                                                            2
                                                                    }
                                                                    keyboard={
                                                                        keyboard
                                                                    }
                                                                    className="flex items-center justify-between gap-3 border-b bg-card px-4 py-3 last:border-b-0 sm:pl-9"
                                                                >
                                                                    <div className="flex min-w-0 items-center gap-3">
                                                                        <CategoryDragHandle />
                                                                        <CornerDownRight
                                                                            className="size-4 shrink-0 text-muted-foreground"
                                                                            aria-hidden="true"
                                                                        />
                                                                        <span className="text-sm wrap-break-word">
                                                                            {
                                                                                child.name
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <CategoryEditor
                                                                        disabled={
                                                                            dirty ||
                                                                            saving
                                                                        }
                                                                        key={
                                                                            child.updatedAt
                                                                        }
                                                                        financialAccountId={
                                                                            financialAccountId
                                                                        }
                                                                        category={
                                                                            child
                                                                        }
                                                                    />
                                                                </SortableCategory>
                                                            )
                                                        )}
                                                    </ul>
                                                )}
                                            </SortableCategory>
                                        )
                                    })}
                                </ul>
                            ) : (
                                <Empty className="border py-14">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            {search ? <Search /> : <Layers />}
                                        </EmptyMedia>
                                        <EmptyTitle>
                                            {search
                                                ? "No categories found"
                                                : `Make room for your ${type === "EXPENSE" ? "expenses" : "income"}`}
                                        </EmptyTitle>
                                        <EmptyDescription>
                                            {search
                                                ? "Try a different name, or clear your search to see all categories in this tab."
                                                : "Create your first category. You can add subcategories whenever you need more detail."}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    <EmptyContent>
                                        <Button
                                            variant={
                                                search ? "outline" : "default"
                                            }
                                            disabled={
                                                !search && (dirty || saving)
                                            }
                                            onClick={() =>
                                                search
                                                    ? setQuery("")
                                                    : setCreating({ type })
                                            }
                                        >
                                            {search
                                                ? "Clear search"
                                                : "Create a category"}
                                        </Button>
                                    </EmptyContent>
                                </Empty>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
                <p className="text-xs leading-6 text-muted-foreground">
                    Categories keep your transactions organized. Use
                    subcategories for the finer details. Archive categories you
                    no longer need to keep their transaction history.
                </p>
                <Dialog
                    open={Boolean(creating)}
                    onOpenChange={(open) => {
                        if (!open) setCreating(null)
                    }}
                >
                    <DialogContent className="max-h-[90svh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {creating?.parentId
                                    ? "New subcategories"
                                    : "New categories"}
                            </DialogTitle>
                            <DialogDescription>
                                {creating?.parentId
                                    ? `Add more detail under ${categories.find((c) => c.id === creating.parentId)?.name}.`
                                    : "Add one category or paste a list to create several at once."}
                            </DialogDescription>
                        </DialogHeader>
                        {creating && (
                            <CreateCategoryForm
                                financialAccountId={financialAccountId}
                                categories={categories}
                                defaultType={creating.type}
                                defaultParentId={creating.parentId}
                                onSuccess={closeCreation}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </DragDropProvider>
    )
}
