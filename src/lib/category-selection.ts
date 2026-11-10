export type CategoryChoice = {
    id: string
    name: string
    parentId: string | null
    type?: string
}
export type CategoryScope = { categoryId: string; includeChildren: boolean }
export type CategorySelection = {
    all: boolean
    uncategorized: boolean
    categories: CategoryScope[]
}
export const ALL_CATEGORIES: CategorySelection = {
    all: true,
    uncategorized: false,
    categories: [],
}
export const NO_CATEGORIES: CategorySelection = {
    all: false,
    uncategorized: false,
    categories: [],
}

export function parseCategorySelection(
    value: unknown
): CategorySelection | null {
    if (typeof value !== "string" || value.length > 40_000) return null
    try {
        const parsed = JSON.parse(value)
        if (
            !parsed ||
            typeof parsed.all !== "boolean" ||
            typeof parsed.uncategorized !== "boolean" ||
            !Array.isArray(parsed.categories) ||
            parsed.categories.length > 200
        )
            return null
        const seen = new Set<string>()
        for (const item of parsed.categories) {
            if (
                !item ||
                typeof item.categoryId !== "string" ||
                !/^[a-zA-Z0-9_-]{1,128}$/.test(item.categoryId) ||
                typeof item.includeChildren !== "boolean" ||
                seen.has(item.categoryId)
            )
                return null
            seen.add(item.categoryId)
        }
        if (parsed.all && (parsed.uncategorized || parsed.categories.length))
            return null
        return {
            all: parsed.all,
            uncategorized: parsed.uncategorized,
            categories: parsed.categories.map((c: CategoryScope) => ({
                categoryId: c.categoryId,
                includeChildren: c.includeChildren,
            })),
        }
    } catch {
        return null
    }
}
export function matchesCategorySelection(
    selection: CategorySelection,
    categoryId: string | null,
    parentId: string | null
) {
    return (
        selection.all ||
        (categoryId === null
            ? selection.uncategorized
            : selection.categories.some(
                  (scope) =>
                      scope.categoryId === categoryId ||
                      (scope.includeChildren && scope.categoryId === parentId)
              ))
    )
}
export function categorySelectionLabels(
    selection: CategorySelection,
    categories: CategoryChoice[]
) {
    if (selection.all) return ["All categories"]
    const byId = new Map(categories.map((c) => [c.id, c]))
    const labels = selection.categories.map((scope) => {
        const item = byId.get(scope.categoryId)
        if (!item) return "Unavailable category"
        const parent = item.parentId ? byId.get(item.parentId) : null
        return parent
            ? `${parent.name} / ${item.name}`
            : scope.includeChildren
              ? `${item.name} (all)`
              : `${item.name} / Without subcategory`
    })
    if (selection.uncategorized) labels.push("Uncategorized")
    return labels
}
/** Analytics uses exact IDs (parent ID means without a subcategory). */
export function categorySelectionToIds(
    selection: CategorySelection,
    categories: CategoryChoice[]
): string[] | null {
    if (selection.all) return null
    return [
        ...categories
            .filter((category) =>
                matchesCategorySelection(
                    selection,
                    category.id,
                    category.parentId
                )
            )
            .map((c) => c.id),
        ...(selection.uncategorized ? ["__uncategorized__"] : []),
    ]
}
export function categorySelectionFromIds(
    ids: string[] | null,
    categories: CategoryChoice[],
    previous?: CategorySelection
): CategorySelection {
    if (ids === null) return ALL_CATEGORIES
    const remaining = new Set(ids)
    const scopes: CategoryScope[] = []
    for (const root of categories.filter((c) => !c.parentId)) {
        const children = categories.filter((c) => c.parentId === root.id)
        const group = [root, ...children]
        // A full visible group is a whole-parent scope. Preserve an existing
        // subtree even when only an archived/childless root is available to edit.
        if (
            group.every((c) => remaining.has(c.id)) &&
            (children.length > 0 ||
                !previous?.categories.some(
                    (s) => s.categoryId === root.id && !s.includeChildren
                ))
        ) {
            scopes.push({ categoryId: root.id, includeChildren: true })
            group.forEach((c) => remaining.delete(c.id))
        }
    }
    for (const category of categories)
        if (remaining.has(category.id)) {
            scopes.push({ categoryId: category.id, includeChildren: false })
            remaining.delete(category.id)
        }
    return {
        all: false,
        uncategorized: remaining.has("__uncategorized__"),
        categories: scopes,
    }
}
