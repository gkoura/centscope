export const categoryTypes = [
    { value: "EXPENSE", label: "Expense" },
    { value: "INCOME", label: "Income" },
] as const

export const defaultCategories = [
    ...[
        "Food & drink",
        "Home & bills",
        "Transport",
        "Shopping",
        "Health",
        "Leisure",
        "Other expenses",
    ].map((name) => ({ name, type: "EXPENSE" as const })),
    ...["Salary", "Other income"].map((name) => ({
        name,
        type: "INCOME" as const,
    })),
]

export type CategoryInput = {
    financialAccountId: string
    name: string
    type: "EXPENSE" | "INCOME"
    parentId: string | null
}
export type CategoryFormState = {
    success?: boolean
    errors?: Partial<Record<keyof CategoryInput, string>>
    message?: string
}

function text(form: FormData, name: string) {
    const value = form.get(name)
    return typeof value === "string" ? value.trim() : ""
}

export function validCategoryName(name: string) {
    return Boolean(name) && name.length <= 80 && !/[\p{Cc}\p{Cf}]/u.test(name)
}

export function validateCategoryInput(
    form: FormData
):
    | { data: CategoryInput; errors?: never }
    | { data?: never; errors: NonNullable<CategoryFormState["errors"]> } {
    const financialAccountId = text(form, "financialAccountId")
    const name = text(form, "name")
    const type = text(form, "type")
    const parentId = text(form, "parentId") || null
    const errors: NonNullable<CategoryFormState["errors"]> = {}
    if (!financialAccountId || financialAccountId.length > 128)
        errors.financialAccountId = "This account is unavailable."
    if (!validCategoryName(name))
        errors.name = "Enter a category name between 1 and 80 characters."
    if (type !== "EXPENSE" && type !== "INCOME")
        errors.type = "Choose Expense or Income."
    if (parentId && parentId.length > 128)
        errors.parentId = "Choose a valid parent category."
    if (Object.keys(errors).length) return { errors }
    return {
        data: {
            financialAccountId,
            name,
            type: type as CategoryInput["type"],
            parentId,
        },
    }
}

export function parseSubcategoryNames(value: string): {
    names: string[]
    error?: string
} {
    if (value.length > 2500)
        return {
            names: [],
            error: "Add up to 30 subcategories at a time, with names up to 80 characters.",
        }
    const names = value
        .split(/\r?\n/)
        .map((name) => name.trim())
        .filter(Boolean)
    if (
        !names.length ||
        names.length > 30 ||
        names.some((name) => !validCategoryName(name))
    )
        return {
            names: [],
            error: "Enter one subcategory per line, up to 30 names of 80 characters each.",
        }
    if (
        new Set(names.map((name) => name.toLocaleLowerCase())).size !==
        names.length
    )
        return {
            names: [],
            error: "Each subcategory in this list needs a different name.",
        }
    return { names }
}

export function validateCategoryEdit(form: FormData) {
    const financialAccountId = text(form, "financialAccountId")
    const categoryId = text(form, "categoryId")
    const expectedUpdatedAt = text(form, "expectedUpdatedAt")
    const name = text(form, "name")
    const date = new Date(expectedUpdatedAt)
    if (
        !financialAccountId ||
        financialAccountId.length > 128 ||
        !categoryId ||
        categoryId.length > 128 ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString() !== expectedUpdatedAt
    )
        return null
    return { financialAccountId, categoryId, expectedUpdatedAt, name }
}

export type CategoryOrderInput = {
    financialAccountId: string
    type: "EXPENSE" | "INCOME"
    parentId: string | null
    previousIds: string[]
    orderedIds: string[]
}

export function validateCategoryOrder(
    value: unknown
): CategoryOrderInput | null {
    if (!value || typeof value !== "object") return null
    const input = value as Record<string, unknown>
    const validId = (id: unknown): id is string =>
        typeof id === "string" && id.length > 0 && id.length <= 128
    const validIds = (ids: unknown): ids is string[] =>
        Array.isArray(ids) &&
        ids.length > 0 &&
        ids.length <= 10000 &&
        ids.every(validId) &&
        new Set(ids).size === ids.length
    if (
        !validId(input.financialAccountId) ||
        (input.type !== "EXPENSE" && input.type !== "INCOME") ||
        (input.parentId !== null && !validId(input.parentId)) ||
        !validIds(input.previousIds) ||
        !validIds(input.orderedIds)
    )
        return null
    const previous = new Set(input.previousIds)
    if (
        input.previousIds.length !== input.orderedIds.length ||
        !input.orderedIds.every((id) => previous.has(id))
    )
        return null
    return input as CategoryOrderInput
}

export function categoryOrderMatches(current: string[], previous: string[]) {
    return (
        current.length === previous.length &&
        current.every((id, index) => id === previous[index])
    )
}

/** Preserve saved sibling order while keeping each parent's children together. */
export function categorySelectOptions(
    categories: {
        id: string
        name: string
        type: string
        parentId: string | null
    }[],
    type: string
) {
    return categories
        .filter((category) => category.type === type && !category.parentId)
        .flatMap((root) => [
            { value: root.id, label: root.name },
            ...categories
                .filter(
                    (child) => child.parentId === root.id && child.type === type
                )
                .map((child) => ({
                    value: child.id,
                    label: `${root.name} / ${child.name}`,
                })),
        ])
}

export type CategoryOrderBatchInput = {
    financialAccountId: string
    groups: Omit<CategoryOrderInput, "financialAccountId">[]
}

export function validateCategoryOrderBatch(
    value: unknown
): CategoryOrderBatchInput | null {
    if (!value || typeof value !== "object") return null
    const input = value as Record<string, unknown>
    if (
        !Array.isArray(input.groups) ||
        !input.groups.length ||
        input.groups.length > 1000
    )
        return null
    const groups: CategoryOrderBatchInput["groups"] = []
    const keys = new Set<string>()
    for (const group of input.groups) {
        if (!group || typeof group !== "object") return null
        const parsed = validateCategoryOrder({
            ...group,
            financialAccountId: input.financialAccountId,
        })
        if (!parsed) return null
        const key = JSON.stringify([parsed.type, parsed.parentId])
        if (keys.has(key)) return null
        keys.add(key)
        const { type, parentId, previousIds, orderedIds } = parsed
        groups.push({ type, parentId, previousIds, orderedIds })
    }
    return { financialAccountId: input.financialAccountId as string, groups }
}

type CategoryOrderRow = {
    id: string
    type: "EXPENSE" | "INCOME"
    parentId: string | null
}

export function categoryOrderChanges(
    original: CategoryOrderRow[],
    draft: CategoryOrderRow[]
): CategoryOrderBatchInput["groups"] {
    const groups = new Map<string, CategoryOrderRow[]>()
    for (const category of original) {
        const key = JSON.stringify([category.type, category.parentId])
        const siblings = groups.get(key) ?? []
        siblings.push(category)
        groups.set(key, siblings)
    }
    return [...groups.values()].flatMap((siblings) => {
        const { type, parentId } = siblings[0]
        const previousIds = siblings.map((category) => category.id)
        const orderedIds = draft
            .filter(
                (category) =>
                    category.type === type && category.parentId === parentId
            )
            .map((category) => category.id)
        return categoryOrderMatches(previousIds, orderedIds)
            ? []
            : [{ type, parentId, previousIds, orderedIds }]
    })
}
