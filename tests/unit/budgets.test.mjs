import { ALL_CATEGORIES } from "../../src/lib/category-selection.ts"
const subtree = (categoryId) => ({
    all: false,
    uncategorized: false,
    categories: [{ categoryId, includeChildren: true }],
})
const exact = (categoryId) => ({
    all: false,
    uncategorized: false,
    categories: [{ categoryId, includeChildren: false }],
})
import test from "node:test"
import assert from "node:assert/strict"
import { validateBudgetInput } from "../../src/lib/budget-input.ts"
import { budgetProgress } from "../../src/lib/budget-progress.ts"
import { canonicalWorkspaceRequest } from "../../src/lib/workspace-cache-policy.ts"

const form = (values = {}) => {
    const data = new FormData()
    for (const [key, value] of Object.entries({
        financialAccountId: "account-a",
        name: "Food",
        recurrence: "MONTHLY",
        spendingLimit: "300.00",
        currency: "EUR",
        categorySelection: JSON.stringify(ALL_CATEGORIES),
        ...values,
    }))
        data.set(key, value)
    return data
}
test("budget validation rejects invalid money, recurrence, currency and stale edit versions", () => {
    assert.equal(
        validateBudgetInput(form({ spendingLimit: "30,50" })).spendingLimit,
        "30.50"
    )
    for (const spendingLimit of [
        "0",
        "-1",
        "1.001",
        "NaN",
        "1e3",
        "1000000000000",
        "",
        "0.00",
    ])
        assert.equal(validateBudgetInput(form({ spendingLimit })), null)
    for (const values of [
        { recurrence: "NEVER" },
        { recurrence: "" },
        { currency: "ABC" },
        { name: "\u0001bad" },
        { id: "budget", version: "0" },
        { id: "budget", version: "1.2" },
    ])
        assert.equal(validateBudgetInput(form(values)), null)
    assert.ok(validateBudgetInput(form({ id: "budget", version: "2" })))
    for (const recurrence of ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
        assert.ok(validateBudgetInput(form({ recurrence })))
})
const groups = [
    { currency: "EUR", categoryId: "food", parentId: null, amount: "-0.10" },
    {
        currency: "EUR",
        categoryId: "groceries",
        parentId: "food",
        amount: "-0.20",
    },
    {
        currency: "EUR",
        categoryId: "transport",
        parentId: null,
        amount: "-10.00",
    },
    { currency: "EUR", categoryId: null, parentId: null, amount: "-5.00" },
    {
        currency: "GBP",
        categoryId: "groceries",
        parentId: "food",
        amount: "-90.00",
    },
]
test("progress includes subcategories, isolates currencies and counts uncategorized expenses only for all spending", () => {
    assert.deepEqual(budgetProgress("1.00", "EUR", subtree("food"), groups), {
        spent: "0.30",
        remaining: "0.70",
        percentage: 30,
    })
    assert.equal(
        budgetProgress("1.00", "EUR", exact("groceries"), groups).spent,
        "0.20"
    )
    assert.equal(
        budgetProgress("20.00", "EUR", ALL_CATEGORIES, groups).spent,
        "15.30"
    )
    assert.equal(
        budgetProgress("100.00", "GBP", subtree("food"), groups).spent,
        "90.00"
    )
    assert.deepEqual(budgetProgress("5.00", "USD", ALL_CATEGORIES, groups), {
        spent: "0.00",
        remaining: "5.00",
        percentage: 0,
    })
})
test("overspending and large totals retain exact cents; limits never divide by zero", () => {
    assert.deepEqual(budgetProgress("10.00", "EUR", ALL_CATEGORIES, groups), {
        spent: "15.30",
        remaining: "-5.30",
        percentage: 153,
    })
    assert.deepEqual(budgetProgress("0.30", "EUR", subtree("food"), groups), {
        spent: "0.30",
        remaining: "0.00",
        percentage: 100,
    })
    const large = [
        {
            currency: "EUR",
            categoryId: null,
            parentId: null,
            amount: "-999999999999.99",
        },
    ]
    assert.equal(
        budgetProgress("999999999999.98", "EUR", ALL_CATEGORIES, large)
            .remaining,
        "-0.01"
    )
    assert.throws(() => budgetProgress("0.00", "EUR", ALL_CATEGORIES, groups))
})
test("budget cache keys isolate months and ignore unrelated transaction filters", () => {
    const request = (query) =>
        canonicalWorkspaceRequest(
            { resource: "budgets", accountId: "a", query },
            "2026-11-10"
        )
    assert.deepEqual(
        request({
            cadence: "MONTHLY",
            date: "2026-11-01",
            status: "PENDING",
            wallet: "b",
        }),
        request({})
    )
    assert.notDeepEqual(request({}), request({ date: "2026-12-01" }))
})

import {
    budgetPeriod,
    moveBudgetPeriod,
    validBudgetDay,
} from "../../src/lib/budget-period.ts"
test("recurring periods cover leap days, Monday weeks and year crossings with exclusive ends", () => {
    assert.deepEqual(
        [
            budgetPeriod("MONTHLY", "2024-02-29").from,
            budgetPeriod("MONTHLY", "2024-02-29").until,
        ],
        ["2024-02-01", "2024-03-01"]
    )
    assert.deepEqual(
        [
            budgetPeriod("YEARLY", "2024-02-29").from,
            budgetPeriod("YEARLY", "2024-02-29").until,
        ],
        ["2024-01-01", "2025-01-01"]
    )
    assert.deepEqual(
        [
            budgetPeriod("WEEKLY", "2027-01-01").from,
            budgetPeriod("WEEKLY", "2027-01-01").until,
        ],
        ["2026-12-28", "2027-01-04"]
    )
    assert.equal(budgetPeriod("DAILY", "2024-02-29").until, "2024-03-01")
    assert.equal(moveBudgetPeriod("MONTHLY", "2026-12-25", 1), "2027-01-01")
    assert.equal(moveBudgetPeriod("WEEKLY", "2027-01-03", 1), "2027-01-04")
    assert.equal(moveBudgetPeriod("YEARLY", "1900-01-01", -1), null)
    assert.equal(moveBudgetPeriod("DAILY", "9998-12-31", 1), null)
    assert.equal(validBudgetDay("2025-02-29"), false)
})
test("week and year query keys normalize within a period while isolating each recurrence", () => {
    const request = (cadence, date) =>
        canonicalWorkspaceRequest(
            { resource: "budgets", accountId: "a", query: { cadence, date } },
            "2026-11-10"
        )
    assert.deepEqual(
        request("WEEKLY", "2026-11-09"),
        request("WEEKLY", "2026-11-15")
    )
    assert.notDeepEqual(
        request("WEEKLY", "2026-11-15"),
        request("WEEKLY", "2026-11-16")
    )
    assert.deepEqual(
        request("YEARLY", "2026-01-01"),
        request("YEARLY", "2026-12-31")
    )
    assert.notDeepEqual(
        request("DAILY", "2026-11-10"),
        request("MONTHLY", "2026-11-10")
    )
})
