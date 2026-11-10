import test from "node:test"
import assert from "node:assert/strict"
import {
    ALL_CATEGORIES,
    NO_CATEGORIES,
    matchesCategorySelection,
    parseCategorySelection,
    categorySelectionToIds,
    categorySelectionFromIds,
    categorySelectionLabels,
} from "../../src/lib/category-selection.ts"
import { budgetProgress } from "../../src/lib/budget-progress.ts"
import { validateBudgetInput } from "../../src/lib/budget-input.ts"
const categories = [
    { id: "food", name: "Food", parentId: null },
    { id: "groceries", name: "Groceries", parentId: "food" },
    { id: "restaurants", name: "Restaurants", parentId: "food" },
    { id: "coffee", name: "Coffee", parentId: "food" },
    { id: "travel", name: "Travel", parentId: null },
]
const scope = (categoryId, includeChildren = false) => ({
    categoryId,
    includeChildren,
})
const selection = (...categories) => ({
    all: false,
    uncategorized: false,
    categories,
})
const groups = [
    { currency: "EUR", categoryId: "food", parentId: null, amount: "-5.00" },
    {
        currency: "EUR",
        categoryId: "groceries",
        parentId: "food",
        amount: "-10.00",
    },
    {
        currency: "EUR",
        categoryId: "restaurants",
        parentId: "food",
        amount: "-20.00",
    },
    {
        currency: "EUR",
        categoryId: "coffee",
        parentId: "food",
        amount: "-30.00",
    },
    { currency: "EUR", categoryId: null, parentId: null, amount: "-40.00" },
]
test("multiple subcategories exclude unselected siblings and direct parent entries", () => {
    const selected = selection(scope("groceries"), scope("restaurants"))
    assert.equal(
        budgetProgress("100.00", "EUR", selected, groups).spent,
        "30.00"
    )
    assert.equal(matchesCategorySelection(selected, "food", null), false)
    assert.equal(matchesCategorySelection(selected, "coffee", "food"), false)
})
test("without-subcategory selection is distinct from both entire parent and uncategorized", () => {
    const direct = selection(scope("food"))
    assert.equal(budgetProgress("100.00", "EUR", direct, groups).spent, "5.00")
    assert.equal(
        budgetProgress("100.00", "EUR", selection(scope("food", true)), groups)
            .spent,
        "65.00"
    )
    assert.equal(
        budgetProgress(
            "100.00",
            "EUR",
            { ...NO_CATEGORIES, uncategorized: true },
            groups
        ).spent,
        "40.00"
    )
    assert.equal(
        budgetProgress("100.00", "EUR", ALL_CATEGORIES, groups).spent,
        "105.00"
    )
    assert.equal(
        categorySelectionLabels(direct, categories)[0],
        "Food / Without subcategory"
    )
})
test("overlapping parent and child selections never double count and subtree includes future children", () => {
    const selected = selection(scope("food", true), scope("groceries"))
    assert.equal(
        budgetProgress("100.00", "EUR", selected, groups).spent,
        "65.00"
    )
    assert.equal(matchesCategorySelection(selected, "new-child", "food"), true)
})
test("Analytics IDs round-trip two children and direct entries without selecting the parent group", () => {
    const selected = selection(
        scope("groceries"),
        scope("restaurants"),
        scope("food")
    )
    const ids = categorySelectionToIds(selected, categories)
    assert.deepEqual(
        new Set(ids),
        new Set(["food", "groceries", "restaurants"])
    )
    const restored = categorySelectionFromIds(ids, categories, selected)
    assert.equal(matchesCategorySelection(restored, "coffee", "food"), false)
    assert.equal(matchesCategorySelection(restored, "food", null), true)
    assert.equal(
        budgetProgress("100.00", "EUR", restored, groups).spent,
        "35.00"
    )
})
test("Analytics adapter preserves whole-parent scopes and handles all, empty and uncategorized", () => {
    const selected = selection(scope("food", true))
    assert.deepEqual(
        categorySelectionFromIds(
            categorySelectionToIds(selected, categories),
            categories,
            selected
        ),
        selected
    )
    assert.deepEqual(categorySelectionFromIds(null, categories), ALL_CATEGORIES)
    assert.deepEqual(categorySelectionFromIds([], categories), NO_CATEGORIES)
    assert.equal(
        categorySelectionFromIds(["__uncategorized__"], categories)
            .uncategorized,
        true
    )
    const leaf = selection(scope("travel", true))
    assert.deepEqual(
        categorySelectionFromIds(["travel"], categories, leaf),
        leaf
    )
})
test("scope parser rejects malformed, contradictory and duplicate choices; budgets reject empty scope", () => {
    for (const value of [
        "{",
        "null",
        JSON.stringify({ ...ALL_CATEGORIES, categories: [scope("food")] }),
        JSON.stringify(selection(scope("food"), scope("food", true))),
        JSON.stringify(selection(scope("bad,id"))),
        JSON.stringify(
            selection({ categoryId: "food", includeChildren: "yes" })
        ),
    ])
        assert.equal(parseCategorySelection(value), null)
    assert.deepEqual(
        parseCategorySelection(JSON.stringify(selection(scope("food")))),
        selection(scope("food"))
    )
    const form = new FormData()
    for (const [key, value] of Object.entries({
        financialAccountId: "a",
        name: "Budget",
        recurrence: "MONTHLY",
        currency: "EUR",
        spendingLimit: "100",
        categorySelection: JSON.stringify(NO_CATEGORIES),
    }))
        form.set(key, value)
    assert.equal(validateBudgetInput(form), null)
    form.set(
        "categorySelection",
        JSON.stringify({ all: false, uncategorized: true, categories: [] })
    )
    assert.ok(validateBudgetInput(form))
})
