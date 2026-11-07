"use client"

import { useActionState, useState, useEffect } from "react"
import {
    archiveCategory,
    createCategory,
    deleteCategory,
    renameCategory,
} from "@/app/dashboard/accounts/[id]/categories/actions"
import { categoryTypes, type CategoryFormState } from "@/lib/category-input"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export type CategoryChoice = {
    id: string
    name: string
    type: "EXPENSE" | "INCOME"
    parentId: string | null
}
import { PencilIcon, PlusIcon, ArchiveIcon } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

const initialState: CategoryFormState = {}

export function CreateCategoryForm({
    financialAccountId,
    categories,
    defaultType = "EXPENSE",
    defaultParentId = "root",
    onSuccess,
}: {
    financialAccountId: string
    categories: CategoryChoice[]
    defaultType?: "EXPENSE" | "INCOME"
    defaultParentId?: string
    onSuccess?: (type: CategoryChoice["type"]) => void
}) {
    const [state, action, pending] = useActionState(
        createCategory,
        initialState
    )
    const [type, setType] = useState<string>(defaultType)
    const [parentId, setParentId] = useState(defaultParentId)
    const [names, setNames] = useState("")
    useEffect(() => {
        if (state.success) onSuccess?.(type as CategoryChoice["type"])
    }, [state.success, onSuccess, type])
    const roots = categories.filter(
        (category) => !category.parentId && category.type === type
    )
    const selectedParentId = roots.some(({ id }) => id === parentId)
        ? parentId
        : "root"
    const parents = [
        { value: "root", label: "No parent — top-level category" },
        ...roots.map(({ id, name }) => ({ value: id, label: name })),
    ]
    return (
        <form action={action} className="flex flex-col gap-5">
            <input
                type="hidden"
                name="financialAccountId"
                value={financialAccountId}
            />
            <input
                type="hidden"
                name="parentId"
                value={selectedParentId === "root" ? "" : selectedParentId}
            />
            <FieldGroup>
                <Field data-invalid={Boolean(state.errors?.name)}>
                    <FieldLabel htmlFor="new-category-name">
                        {selectedParentId === "root"
                            ? "Category names"
                            : "Subcategory names"}
                    </FieldLabel>
                    <Textarea
                        id="new-category-name"
                        name="names"
                        value={names}
                        onChange={(event) => setNames(event.target.value)}
                        required
                        maxLength={2500}
                        rows={5}
                        placeholder={
                            selectedParentId === "root"
                                ? type === "INCOME"
                                    ? "Salary\nFreelance\nInvestments"
                                    : "Travel\nEducation\nSubscriptions"
                                : "Restaurants\nCoffee shops\nTakeaway"
                        }
                        aria-invalid={Boolean(state.errors?.name)}
                        aria-describedby={`new-category-names-description${state.errors?.name ? " new-category-name-error" : ""}`}
                    />
                    <FieldDescription id="new-category-names-description">
                        Enter or paste one name per line. Create up to 30{" "}
                        {selectedParentId === "root"
                            ? "categories"
                            : "subcategories"}{" "}
                        at once, with up to 80 characters per name.
                    </FieldDescription>
                    {state.errors?.name ? (
                        <FieldError id="new-category-name-error">
                            {state.errors.name}
                        </FieldError>
                    ) : null}
                </Field>
                <Field data-invalid={Boolean(state.errors?.type)}>
                    <FieldLabel htmlFor="new-category-type">Type</FieldLabel>
                    <Select
                        name="type"
                        value={type}
                        items={categoryTypes}
                        onValueChange={(value) => {
                            if (value) {
                                setType(value)
                                setParentId("root")
                            }
                        }}
                    >
                        <SelectTrigger
                            id="new-category-type"
                            className="w-full"
                            aria-invalid={Boolean(state.errors?.type)}
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {categoryTypes.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    {state.errors?.type ? (
                        <FieldError>{state.errors.type}</FieldError>
                    ) : null}
                </Field>
                <Field data-invalid={Boolean(state.errors?.parentId)}>
                    <FieldLabel htmlFor="new-category-parent">
                        Parent category
                    </FieldLabel>
                    <Select
                        value={selectedParentId}
                        items={parents}
                        onValueChange={(value) => {
                            if (value) setParentId(value)
                        }}
                    >
                        <SelectTrigger
                            id="new-category-parent"
                            className="w-full"
                            aria-invalid={Boolean(state.errors?.parentId)}
                            aria-describedby="new-category-parent-description"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {parents.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <FieldDescription id="new-category-parent-description">
                        Choose a parent to create a subcategory. Subcategories
                        have the same type as their parent.
                    </FieldDescription>
                    {state.errors?.parentId ? (
                        <FieldError>{state.errors.parentId}</FieldError>
                    ) : null}
                </Field>
            </FieldGroup>
            {state.message ? (
                <p role="status" className="text-sm">
                    {state.message}
                </p>
            ) : null}
            {state.errors?.financialAccountId ? (
                <FieldError>{state.errors.financialAccountId}</FieldError>
            ) : null}
            <div className="flex justify-end gap-2">
                <DialogClose
                    render={
                        <Button
                            variant="outline"
                            type="button"
                            disabled={pending}
                        />
                    }
                >
                    Cancel
                </DialogClose>
                <Button type="submit" disabled={pending}>
                    {pending ? (
                        <Spinner data-icon="inline-start" />
                    ) : (
                        <PlusIcon data-icon="inline-start" />
                    )}
                    {pending
                        ? "Creating…"
                        : selectedParentId === "root"
                          ? "Create categories"
                          : "Create subcategories"}
                </Button>
            </div>
        </form>
    )
}

export function CategoryEditor({
    financialAccountId,
    category,
    disabled = false,
}: {
    disabled?: boolean
    financialAccountId: string
    category: {
        id: string
        name: string
        parentId: string | null
        updatedAt: string
    }
}) {
    const [renameState, rename, renaming] = useActionState(
        renameCategory,
        initialState
    )
    const [archiveState, archive, archiving] = useActionState(
        archiveCategory,
        initialState
    )
    const [deleteState, remove, deleting] = useActionState(
        deleteCategory,
        initialState
    )
    const fields = (
        <>
            <input
                type="hidden"
                name="financialAccountId"
                value={financialAccountId}
            />
            <input type="hidden" name="categoryId" value={category.id} />
            <input
                type="hidden"
                name="expectedUpdatedAt"
                value={category.updatedAt}
            />
        </>
    )
    return (
        <Dialog>
            <DialogTrigger
                render={<Button variant="ghost" size="sm" />}
                disabled={disabled}
                aria-label={`Edit ${category.name}`}
            >
                <PencilIcon data-icon="inline-start" />
                Edit
            </DialogTrigger>
            <DialogContent className="max-h-[90svh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="pr-6 break-words">
                        Edit {category.name}
                    </DialogTitle>
                    <DialogDescription>
                        Update the name or manage this{" "}
                        {category.parentId ? "subcategory" : "category"}.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-5">
                    <form action={rename} className="flex flex-col gap-3">
                        {fields}
                        <Field data-invalid={Boolean(renameState.errors?.name)}>
                            <FieldLabel htmlFor={`rename-${category.id}`}>
                                Category name
                            </FieldLabel>
                            <Input
                                id={`rename-${category.id}`}
                                name="name"
                                required
                                maxLength={80}
                                defaultValue={category.name}
                                aria-invalid={Boolean(renameState.errors?.name)}
                            />
                            {renameState.errors?.name ? (
                                <FieldError>
                                    {renameState.errors.name}
                                </FieldError>
                            ) : null}
                        </Field>
                        {renameState.message ? (
                            <FieldError role="alert">
                                {renameState.message}
                            </FieldError>
                        ) : null}
                        <Button
                            type="submit"
                            disabled={renaming || archiving || deleting}
                        >
                            {renaming ? "Saving…" : "Save name"}
                        </Button>
                    </form>
                    <div className="flex flex-col gap-3 border-t pt-5">
                        <p className="text-xs font-medium text-muted-foreground">
                            REMOVE FROM YOUR CATEGORIES
                        </p>
                        <AlertDialog>
                            <AlertDialogTrigger
                                render={<Button variant="outline" />}
                                disabled={archiving || renaming || deleting}
                            >
                                <ArchiveIcon data-icon="inline-start" />
                                Archive{" "}
                                {category.parentId ? "subcategory" : "category"}
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <form
                                    action={archive}
                                    className="flex flex-col gap-4"
                                >
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="break-words">
                                            Archive {category.name}?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {fields}
                                            Archiving hides this{" "}
                                            {category.parentId
                                                ? "subcategory"
                                                : "category and its subcategories"}{" "}
                                            from new transactions. Existing
                                            history is kept. It will no longer
                                            appear in this list.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    {archiveState.message ? (
                                        <FieldError role="alert">
                                            {archiveState.message}
                                        </FieldError>
                                    ) : null}
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={archiving}>
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            type="submit"
                                            disabled={
                                                archiving ||
                                                renaming ||
                                                deleting
                                            }
                                        >
                                            {archiving
                                                ? "Archiving…"
                                                : "Archive"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </form>
                            </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                            <AlertDialogTrigger
                                type="button"
                                render={<Button variant="destructive" />}
                                disabled={renaming || archiving || deleting}
                                aria-label={`Delete ${category.name} permanently`}
                            >
                                Delete permanently
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <form
                                    action={remove}
                                    className="flex flex-col gap-4"
                                >
                                    {fields}
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="break-words">
                                            Delete {category.name}?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This permanently deletes this{" "}
                                            {category.parentId
                                                ? "subcategory"
                                                : "category and all its subcategories"}
                                            . This cannot be undone. Deletion is
                                            blocked if any transaction uses it
                                            {category.parentId
                                                ? "."
                                                : " or any of its subcategories."}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    {deleteState.message ? (
                                        <FieldError role="alert">
                                            {deleteState.message}
                                        </FieldError>
                                    ) : null}
                                    <AlertDialogFooter>
                                        <AlertDialogCancel
                                            type="button"
                                            disabled={deleting}
                                        >
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            type="submit"
                                            variant="destructive"
                                            disabled={deleting}
                                        >
                                            {deleting
                                                ? "Deleting…"
                                                : category.parentId
                                                  ? "Delete subcategory"
                                                  : "Delete category"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </form>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <DialogClose render={<Button variant="ghost" />}>
                        Done
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    )
}
