import test from "node:test"
import assert from "node:assert/strict"
import {
    categoryIcons,
    isCategoryIconKey,
    resolveCategoryIcon,
} from "../../src/lib/category-icons.ts"
import {
    defaultCategories,
    validateCategoryInput,
} from "../../src/lib/category-input.ts"

test("curated stable icon keys are unique and every seeded category has a valid icon", () => {
    assert.equal(
        new Set(categoryIcons.map((i) => i.key)).size,
        categoryIcons.length
    )
    assert.ok(defaultCategories.every((c) => isCategoryIconKey(c.iconKey)))
})
test("child overrides, clearing, inheritance and unknown keys resolve safely", () => {
    assert.equal(resolveCategoryIcon("coffee", "utensils"), "coffee")
    assert.equal(resolveCategoryIcon(null, "utensils"), "utensils")
    assert.equal(resolveCategoryIcon("", "utensils"), "utensils")
    assert.equal(resolveCategoryIcon("future-key", "house"), "house")
    assert.equal(resolveCategoryIcon(undefined), "tag")
    assert.equal(resolveCategoryIcon("unknown", "unknown"), "tag")
    assert.equal(resolveCategoryIcon("constructor", "__proto__"), "tag")
})
test("server input rejects arbitrary content, unknown keys and files, and permits clearing", () => {
    const form = new FormData()
    form.set("financialAccountId", "account")
    form.set("name", "Coffee")
    form.set("type", "EXPENSE")
    assert.equal(validateCategoryInput(form).data.iconKey, null)
    for (const key of ["coffee", "house", ""]) {
        form.set("iconKey", key)
        assert.equal(validateCategoryInput(form).data.iconKey, key || null)
    }
    for (const key of [
        "unknown",
        '<svg onload="alert(1)">',
        "constructor",
        "__proto__",
        "a".repeat(10000),
    ]) {
        form.set("iconKey", key)
        assert.ok(validateCategoryInput(form).errors.iconKey)
    }
    form.set("iconKey", new Blob(["coffee"]), "icon.svg")
    assert.ok(validateCategoryInput(form).errors.iconKey)
})

test("general-purpose recurring icons are discoverable", () => {
    const recurring = categoryIcons.filter((icon) =>
        icon.label.toLowerCase().includes("recurring")
    )
    assert.ok(recurring.some((icon) => icon.key === "repeat"))
    for (const key of ["calendar", "clock", "folder", "star", "users"])
        assert.ok(isCategoryIconKey(key))
})
