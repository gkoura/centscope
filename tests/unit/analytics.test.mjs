import test from "node:test"
import assert from "node:assert/strict"
import {
    analyticsPeriodInput,
    categorySpendingGroups,
} from "../../src/lib/analytics.ts"
import { canonicalWorkspaceRequest } from "../../src/lib/workspace-cache-policy.ts"

const today = "2026-11-06"
test("analytics uses transaction month/year/custom periods without inheriting hidden list filters", () => {
    for (const [query, expected] of [
        [
            { view: "month", month: "2026-10" },
            { view: "month", month: "2026-10" },
        ],
        [
            { view: "year", year: "2025" },
            { view: "year", year: "2025" },
        ],
        [
            { view: "custom", from: "2026-02-01", to: "2026-04-30" },
            { view: "custom", from: "2026-02-01", to: "2026-04-30" },
        ],
    ]) {
        const period = analyticsPeriodInput({
            ...query,
            wallet: "bank",
            category: "food",
            status: "PENDING",
            q: "coffee",
            before: "cursor",
        })
        assert.deepEqual(period, expected)
        const request = canonicalWorkspaceRequest(
            { resource: "activity", accountId: "account", query: period },
            today
        )
        assert.deepEqual(request.query, expected)
    }
})

test("category shares use totals within each currency, never a mixed-currency total", () => {
    const result = categorySpendingGroups([
        { name: "Housing", currency: "EUR", amount: "600.00" },
        { name: "Food", currency: "EUR", amount: "400.00" },
        { name: "Travel", currency: "USD", amount: "25.00" },
    ])
    assert.deepEqual(
        result.map((group) => group.categories.map((item) => item.percentage)),
        [[60, 40], [100]]
    )
    assert.equal(result[0].categories[0].amount, "600.00")
})

test("percentage arithmetic stays exact beyond Number safe integers and rounds to hundredths", () => {
    const result = categorySpendingGroups([
        { name: "A", currency: "EUR", amount: "9999999999999999.99" },
        { name: "B", currency: "EUR", amount: "9999999999999999.99" },
    ])
    assert.deepEqual(
        result[0].categories.map((item) => item.percentage),
        [50, 50]
    )
    assert.equal(
        categorySpendingGroups([
            { name: "A", currency: "EUR", amount: "1.00" },
            { name: "B", currency: "EUR", amount: "2.00" },
        ])[0].categories[0].percentage,
        33.33
    )
})

test("empty and zero spending remain safe", () => {
    assert.deepEqual(categorySpendingGroups([]), [])
    assert.equal(
        categorySpendingGroups([
            { name: "A", currency: "EUR", amount: "0.00" },
        ])[0].categories[0].percentage,
        0
    )
})
