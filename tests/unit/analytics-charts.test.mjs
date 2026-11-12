import test from "node:test"
import assert from "node:assert/strict"
import {
    categorySpending,
    budgetComparison,
    monthlyBudgetAmount,
} from "../../src/lib/analytics-charts.ts"
import { monthlyTrendBuckets } from "../../src/lib/monthly-trends.ts"
import { moneyCents } from "../../src/lib/expense-spread.ts"
import { canonicalWorkspaceRequest } from "../../src/lib/workspace-cache-policy.ts"
const categories = [
    { id: "food", name: "Food", parentId: null, type: "EXPENSE", sortOrder: 0 },
    {
        id: "coffee",
        name: "Coffee",
        parentId: "food",
        type: "EXPENSE",
        sortOrder: 0,
    },
    {
        id: "dinner",
        name: "Dinner",
        parentId: "food",
        type: "EXPENSE",
        sortOrder: 1,
    },
]
const entry = (overrides = {}) => ({
    type: "EXPENSE",
    amount: "-100.01",
    currency: "EUR",
    month: "2025-12",
    categoryId: "coffee",
    spread: { startMonth: "2026-01", monthCount: 3 },
    ...overrides,
})
test("category stacks roll children into parents, retain exact totals, zero months and distinct currencies", () => {
    const buckets = monthlyTrendBuckets(
        [
            entry(),
            entry({
                amount: "-6.00",
                categoryId: "food",
                month: "2026-01",
                spread: null,
            }),
            entry({ currency: "USD" }),
        ],
        "2026-12"
    )
    const data = categorySpending(
        buckets,
        categories,
        "2026-12",
        "EUR",
        "smoothed"
    )
    const food = data.groups.find((g) => g.id === "food")
    assert.equal(data.points.length, 12)
    assert.equal(data.points[0].total, "39.34")
    assert.equal(data.points[0].amounts[food.key], "39.34")
    assert.deepEqual(
        data.points[0].breakdown[food.key].map((c) => c.amount).sort(),
        ["33.34", "6.00"]
    )
    assert.equal(data.points[11].total, "0.00")
    assert.equal(
        categorySpending(buckets, categories, "2026-12", "EUR", "actual")
            .points[0].total,
        "6.00"
    )
    assert.equal(
        categorySpending(
            buckets,
            categories,
            "2026-12",
            "USD",
            "smoothed"
        ).groups.find((g) => g.id === "food").color,
        food.color
    )
})
const plan = {
    id: "p",
    name: "Food",
    currency: "EUR",
    recurrence: "MONTHLY",
    spendingLimit: "50.00",
    categorySelection: {
        all: false,
        uncategorized: false,
        categories: [
            { categoryId: "food", includeChildren: true },
            { categoryId: "coffee", includeChildren: false },
            { categoryId: "dinner", includeChildren: false },
        ],
    },
}
const row = (overrides = {}) => ({
    amount: "30.00",
    paidOn: "2026-01-12",
    categoryId: "coffee",
    parentId: "food",
    currency: "EUR",
    spread: null,
    ...overrides,
})
test("budget includes multiple subcategories once, isolates currencies, tracks overspend and excludes out-of-range payments", () => {
    const result = budgetComparison(
        [plan],
        [
            row(),
            row({ categoryId: "dinner" }),
            row({ currency: "USD" }),
            row({ paidOn: "2025-12-31" }),
        ],
        "2026-12",
        "actual"
    )[0]
    assert.deepEqual(result.points[0], {
        month: "2026-01",
        spent: "60.00",
        budget: "50.00",
        remaining: "-10.00",
    })
    assert.equal(result.points[1].spent, "0.00")
    assert.equal(result.points[1].remaining, "50.00")
    assert.deepEqual(budgetComparison([], [], "2026-12", "smoothed"), [])
})
test("budget smoothed monthly totals match category chart allocations for payments outside the window", () => {
    const rows = [
        row({
            amount: "100.01",
            paidOn: "2025-12-01",
            spread: { startMonth: "2026-01", monthCount: 3 },
        }),
    ]
    const points = budgetComparison([plan], rows, "2026-12", "smoothed")[0]
        .points
    assert.deepEqual(
        points.slice(0, 3).map((p) => p.spent),
        ["33.34", "33.34", "33.33"]
    )
    assert.equal(
        budgetComparison([plan], rows, "2026-12", "actual")[0].points[0].spent,
        "0.00"
    )
})
test("yearly monthly shares preserve the full limit including remainder cents", () => {
    const yearly = { ...plan, recurrence: "YEARLY", spendingLimit: "100.01" }
    const points = budgetComparison([yearly], [], "2026-12", "smoothed")[0]
        .points
    assert.equal(
        points.reduce((sum, p) => sum + moneyCents(p.budget), 0n),
        10001n
    )
    assert.equal(points[0].budget, "8.34")
    assert.equal(points[11].budget, "8.33")
})
test("daily and weekly monthly representations respect leap days and weeks crossing month boundaries", () => {
    assert.equal(
        monthlyBudgetAmount(
            { ...plan, recurrence: "DAILY", spendingLimit: "1.00" },
            "2024-02"
        ),
        "29.00"
    )
    assert.equal(
        monthlyBudgetAmount(
            { ...plan, recurrence: "WEEKLY", spendingLimit: "7.00" },
            "2024-02"
        ),
        "29.00"
    )
    // Jan 2024 starts Monday: four full weeks plus Mon-Wed; 10 cents per week gives 2 cents Mon-Wed, 1 Thu-Sun.
    assert.equal(
        monthlyBudgetAmount(
            { ...plan, recurrence: "WEEKLY", spendingLimit: "0.10" },
            "2024-01"
        ),
        "0.46"
    )
})
test("budget comparison cache window and mode are canonical and independent of page filters", () => {
    const request = canonicalWorkspaceRequest(
        {
            resource: "budgetComparison",
            accountId: "a",
            query: { month: "2026-10", mode: "smoothed", from: "2026-01-01" },
        },
        "2026-11-12"
    )
    assert.deepEqual(request.query, { month: "2026-10", mode: "smoothed" })
    assert.equal(
        canonicalWorkspaceRequest(
            { ...request, query: { month: "2026-10", mode: "actual" } },
            "2026-11-12"
        ).query.mode,
        "actual"
    )
})
