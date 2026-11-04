import test from "node:test"
import assert from "node:assert/strict"
import {
    defaultCategories,
    parseSubcategoryNames,
    validateCategoryInput,
    validateCategoryEdit,
} from "../../src/lib/category-input.ts"

function form(fields) {
    const data = new FormData()
    for (const [key, value] of Object.entries(fields)) data.set(key, value)
    return data
}

test("new accounts start with distinct expense/income root categories and no subcategories", () => {
    assert.equal(defaultCategories.length, 9)
    assert.equal(
        defaultCategories.filter(({ type }) => type === "EXPENSE").length,
        7
    )
    assert.equal(
        defaultCategories.filter(({ type }) => type === "INCOME").length,
        2
    )
    assert.equal(
        new Set(
            defaultCategories.map(
                ({ type, name }) => `${type}:${name.toLowerCase()}`
            )
        ).size,
        9
    )
    assert.ok(defaultCategories.every((category) => !category.parentId))
})

test("validates root/subcategory input and preserves international names", () => {
    const root = validateCategoryInput(
        form({
            financialAccountId: "account",
            name: "  Καθημερινά 🛒  ",
            type: "EXPENSE",
        })
    )
    assert.equal(root.data?.name, "Καθημερινά 🛒")
    assert.equal(root.data?.parentId, null)
    assert.equal(
        validateCategoryInput(
            form({
                financialAccountId: "account",
                name: "Restaurants",
                type: "EXPENSE",
                parentId: "food",
            })
        ).data?.parentId,
        "food"
    )
    for (const name of [" ", "x".repeat(81), "Hidden\u0000name"])
        assert.ok(
            validateCategoryInput(
                form({ financialAccountId: "account", name, type: "EXPENSE" })
            ).errors?.name
        )
})

test("editing requires a valid optimistic timestamp and resource IDs", () => {
    const fields = {
        financialAccountId: "account",
        categoryId: "category",
        expectedUpdatedAt: "2026-11-03T00:00:00.000Z",
        name: "Transport",
    }
    assert.ok(validateCategoryEdit(form(fields)))
    assert.equal(
        validateCategoryEdit(form({ ...fields, expectedUpdatedAt: "invalid" })),
        null
    )
    assert.equal(
        validateCategoryEdit(form({ ...fields, categoryId: "" })),
        null
    )
})

test("category order only accepts complete duplicate-free permutations", async () => {
    const { validateCategoryOrder } = await import("../../src/lib/category-input.ts")
    const input = {
        financialAccountId: "account",
        type: "EXPENSE",
        parentId: null,
        previousIds: ["a", "b"],
        orderedIds: ["b", "a"],
    }
    assert.deepEqual(validateCategoryOrder(input), input)
    for (const patch of [
        { financialAccountId: "" },
        { type: "TRANSFER" },
        { parentId: 42 },
        { previousIds: [] },
        { previousIds: ["a", "a"] },
        { orderedIds: ["a", "a"] },
        { orderedIds: ["a"] },
        { orderedIds: ["a", "other-account"] },
        { orderedIds: ["a", null] },
    ])
        assert.equal(validateCategoryOrder({ ...input, ...patch }), null)
    for (const value of [null, undefined, "invalid", []])
        assert.equal(validateCategoryOrder(value), null)
    assert.ok(
        validateCategoryOrder({ ...input, parentId: "parent", type: "INCOME" })
    )
})

test("optimistic order comparison detects changed order and group membership", async () => {
    const { categoryOrderMatches } = await import("../../src/lib/category-input.ts")
    assert.equal(categoryOrderMatches(["a", "b"], ["a", "b"]), true)
    assert.equal(categoryOrderMatches(["b", "a"], ["a", "b"]), false)
    assert.equal(categoryOrderMatches(["a"], ["a", "b"]), false)
    assert.equal(categoryOrderMatches(["a", "b", "c"], ["a", "b"]), false)
    assert.equal(categoryOrderMatches(["a", "c"], ["a", "b"]), false)
})

test("transaction picker preserves saved sibling order and groups children with their parent", async () => {
    const { categorySelectOptions } = await import("../../src/lib/category-input.ts")
    const rows = [
        { id: "z", name: "Travel", type: "EXPENSE", parentId: null },
        { id: "child-z", name: "Trains", type: "EXPENSE", parentId: "z" },
        { id: "child-a", name: "Flights", type: "EXPENSE", parentId: "z" },
        { id: "income", name: "Salary", type: "INCOME", parentId: null },
        { id: "a", name: "Food", type: "EXPENSE", parentId: null },
    ]
    assert.deepEqual(categorySelectOptions(rows, "EXPENSE"), [
        { value: "z", label: "Travel" },
        { value: "child-z", label: "Travel / Trains" },
        { value: "child-a", label: "Travel / Flights" },
        { value: "a", label: "Food" },
    ])
    assert.deepEqual(categorySelectOptions(rows, "INCOME"), [
        { value: "income", label: "Salary" },
    ])
})

test("explicit ordering saves validate all sibling groups without duplicates", async () => {
    const { validateCategoryOrderBatch } = await import("../../src/lib/category-input.ts")
    const root = {
        type: "EXPENSE",
        parentId: null,
        previousIds: ["a", "b"],
        orderedIds: ["b", "a"],
    }
    const child = {
        type: "EXPENSE",
        parentId: "a",
        previousIds: ["c", "d"],
        orderedIds: ["d", "c"],
    }
    const input = { financialAccountId: "account", groups: [root, child] }
    assert.deepEqual(validateCategoryOrderBatch(input), input)
    for (const groups of [
        [],
        [root, root],
        [root, { ...child, orderedIds: ["c", "foreign"] }],
        [null],
        ["invalid"],
    ])
        assert.equal(validateCategoryOrderBatch({ ...input, groups }), null)
    assert.equal(
        validateCategoryOrderBatch({ ...input, financialAccountId: "" }),
        null
    )
})

test("draft order batches only changed groups and recognizes inverse moves as clean", async () => {
    const { categoryOrderChanges } = await import("../../src/lib/category-input.ts")
    const original = [
        { id: "a", type: "EXPENSE", parentId: null },
        { id: "b", type: "EXPENSE", parentId: null },
        { id: "c", type: "EXPENSE", parentId: "a" },
        { id: "d", type: "EXPENSE", parentId: "a" },
        { id: "i", type: "INCOME", parentId: null },
    ]
    assert.deepEqual(categoryOrderChanges(original, [...original]), [])
    const draft = [
        original[1],
        original[0],
        original[3],
        original[2],
        original[4],
    ]
    assert.deepEqual(categoryOrderChanges(original, draft), [
        {
            type: "EXPENSE",
            parentId: null,
            previousIds: ["a", "b"],
            orderedIds: ["b", "a"],
        },
        {
            type: "EXPENSE",
            parentId: "a",
            previousIds: ["c", "d"],
            orderedIds: ["d", "c"],
        },
    ])
    assert.deepEqual(categoryOrderChanges(original, original), [])
})


test("subcategory batches trim pasted lines and preserve punctuation and international names", () => {
    assert.deepEqual(parseSubcategoryNames(" Restaurants \r\n\r\nΚαφές\nFood, takeaway "), { names: ["Restaurants", "Καφές", "Food, takeaway"] })
})

test("subcategory batches reject empty, duplicate, invalid and oversized lists", () => {
    for (const value of [" \n", "Coffee\n coffee", "a".repeat(81), "Bad\tname", Array.from({ length: 31 }, (_, i) => `Name ${i}`).join("\n"), "a".repeat(2501)]) {
        assert.ok(parseSubcategoryNames(value).error)
    }
    assert.equal(parseSubcategoryNames(Array.from({ length: 30 }, (_, i) => `Name ${i}`).join("\n")).names.length, 30)
})
