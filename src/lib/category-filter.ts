import { ALL_CATEGORIES, type CategorySelection } from "./category-selection.ts"

const EMPTY = "__none__"
const UNCATEGORIZED = "__uncategorized__"
const validId = (id: string) => /^[a-zA-Z0-9_-]{1,128}$/.test(id)

export function categoryFilterValue(
    selection: CategorySelection
): string | undefined {
    if (selection.all) return undefined
    const scopes = new Map<string, boolean>()
    for (const scope of selection.categories)
        scopes.set(
            scope.categoryId,
            !!scopes.get(scope.categoryId) || scope.includeChildren
        )
    const tokens = [...scopes].map(
        ([id, children]) => `${children ? "tree" : "direct"}:${id}`
    )
    if (selection.uncategorized) tokens.push(UNCATEGORIZED)
    return tokens.sort().join(",") || EMPTY
}
/** Legacy category IDs included descendants. Invalid/empty selections match nothing. */
export function canonicalCategoryFilter(
    value: string | string[] | undefined
): string | undefined {
    if (
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
    )
        return undefined
    const raw = Array.isArray(value) ? value.join(",") : value
    if (raw.length > 30_000) return EMPTY
    const tokens = raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    if (!tokens.length) return undefined
    if (tokens.length > 200 || tokens.includes(EMPTY)) return EMPTY
    const selection: CategorySelection = {
        all: false,
        uncategorized: false,
        categories: [],
    }
    for (const token of tokens) {
        if (token === UNCATEGORIZED) {
            selection.uncategorized = true
            continue
        }
        const prefix = token.startsWith("direct:")
            ? "direct:"
            : token.startsWith("tree:")
              ? "tree:"
              : ""
        const categoryId = token.slice(prefix.length)
        if (!validId(categoryId)) return EMPTY
        selection.categories.push({
            categoryId,
            includeChildren: prefix !== "direct:",
        })
    }
    return categoryFilterValue(selection)
}
export function categoryFilterSelection(
    value: string | undefined
): CategorySelection {
    const canonical = canonicalCategoryFilter(value)
    if (!canonical) return ALL_CATEGORIES
    const selection: CategorySelection = {
        all: false,
        uncategorized: false,
        categories: [],
    }
    if (canonical === EMPTY) return selection
    for (const token of canonical.split(",")) {
        if (token === UNCATEGORIZED) selection.uncategorized = true
        else
            selection.categories.push({
                categoryId: token.slice(token.indexOf(":") + 1),
                includeChildren: token.startsWith("tree:"),
            })
    }
    return selection
}
/** Apply this inside the same account/wallet-qualified ledger predicate everywhere. */
export function categoryEntryWhere(value: string | undefined) {
    const selection = categoryFilterSelection(value)
    if (selection.all) return {}
    const exact = selection.categories.map((s) => s.categoryId)
    const parents = selection.categories
        .filter((s) => s.includeChildren)
        .map((s) => s.categoryId)
    const OR = [
        ...(exact.length ? [{ categoryId: { in: exact } }] : []),
        ...(parents.length
            ? [{ category: { parentId: { in: parents } } }]
            : []),
        ...(selection.uncategorized ? [{ categoryId: null }] : []),
    ]
    return { OR }
}
