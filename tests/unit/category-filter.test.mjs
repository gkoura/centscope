import test from "node:test"
import assert from "node:assert/strict"
import {
    canonicalCategoryFilter,
    categoryFilterValue,
    categoryFilterSelection,
    categoryEntryWhere,
} from "../../src/lib/category-filter.ts"
import {
    matchesCategorySelection,
    ALL_CATEGORIES,
    NO_CATEGORIES,
} from "../../src/lib/category-selection.ts"
import { parseTransactionFilters } from "../../src/lib/transaction-filters.ts"
import { canonicalWorkspaceRequest } from "../../src/lib/workspace-cache-policy.ts"
import { exportSearch } from "../../src/lib/transaction-export-period.ts"

test("legacy category URLs retain subtree matching; exact parent entries exclude subcategories", () => {
    const old = categoryFilterSelection("food")
    assert.equal(matchesCategorySelection(old, "groceries", "food"), true)
    const direct = categoryFilterSelection("direct:food")
    assert.equal(matchesCategorySelection(direct, "food", null), true)
    assert.equal(matchesCategorySelection(direct, "groceries", "food"), false)
    assert.equal(matchesCategorySelection(direct, null, null), false)
})
test("multiple children, direct entries and uncategorized survive URL and export round trips", () => {
    const value = categoryFilterValue({
        all: false,
        uncategorized: true,
        categories: [
            { categoryId: "groceries", includeChildren: false },
            { categoryId: "restaurants", includeChildren: false },
            { categoryId: "food", includeChildren: false },
        ],
    })
    const filters = parseTransactionFilters({ category: value })
    const restored = categoryFilterSelection(filters.category)
    assert.equal(matchesCategorySelection(restored, "groceries", "food"), true)
    assert.equal(
        matchesCategorySelection(restored, "restaurants", "food"),
        true
    )
    assert.equal(matchesCategorySelection(restored, "food", null), true)
    assert.equal(matchesCategorySelection(restored, "coffee", "food"), false)
    assert.equal(matchesCategorySelection(restored, null, null), true)
    const exported = exportSearch(filters, {
        from: "2026-11-01",
        to: "2026-11-30",
    })
    assert.deepEqual(parseTransactionFilters(Object.fromEntries(exported)), {
        ...filters,
        from: "2026-11-01",
        to: "2026-11-30",
    })
})
test("empty selection matches nothing, all removes filtering, malformed inputs never broaden scope", () => {
    assert.equal(categoryFilterValue(ALL_CATEGORIES), undefined)
    assert.deepEqual(categoryEntryWhere(undefined), {})
    const empty = categoryFilterValue(NO_CATEGORIES)
    assert.equal(empty, "__none__")
    assert.deepEqual(categoryEntryWhere(empty), { OR: [] })
    for (const value of [
        "direct:",
        "bad/id",
        "direct:a,broken:token",
        "a".repeat(30001),
        Array.from({ length: 201 }, (_, i) => `direct:id${i}`).join(","),
    ]) {
        assert.equal(canonicalCategoryFilter(value), "__none__")
        assert.equal(
            matchesCategorySelection(
                categoryFilterSelection(value),
                "food",
                null
            ),
            false
        )
    }
})
test("equivalent category selections canonicalize to one cache key; modes and empty filters remain distinct", () => {
    const request = (category) =>
        canonicalWorkspaceRequest(
            { resource: "transactions", accountId: "a", query: { category } },
            "2026-11-10"
        )
    assert.deepEqual(
        request(["direct:b", "direct:a", "direct:a"]),
        request("direct:a,direct:b")
    )
    assert.deepEqual(request("food"), request("tree:food"))
    assert.notDeepEqual(request("tree:food"), request("direct:food"))
    assert.notDeepEqual(request(undefined), request("__none__"))
    assert.equal(canonicalCategoryFilter("direct:food,tree:food"), "tree:food")
})
test("shared entry predicate keeps direct, descendant and uncategorized branches separate", () => {
    assert.deepEqual(categoryEntryWhere("direct:food,direct:groceries"), {
        OR: [{ categoryId: { in: ["food", "groceries"] } }],
    })
    assert.deepEqual(categoryEntryWhere("tree:food,__uncategorized__"), {
        OR: [
            { categoryId: { in: ["food"] } },
            { category: { parentId: { in: ["food"] } } },
            { categoryId: null },
        ],
    })
})
