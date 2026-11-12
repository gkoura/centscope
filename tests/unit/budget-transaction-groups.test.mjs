import test from "node:test"
import assert from "node:assert/strict"
import { groupBudgetTransactions } from "../../src/lib/budget-transaction-groups.ts"
import { canonicalWorkspaceRequest } from "../../src/lib/workspace-cache-policy.ts"
const row = (id, paidOn, contribution, root = "food", child = "coffee") => ({
    id,
    paidOn,
    contribution,
    categoryGroup: { id: root, name: "Same name" },
    subcategory: child ? { id: child, name: child } : null,
})
test("groups by stable category and subcategory identities, newest first, with exact contribution totals", () => {
    const rows = [
        row("a", "2026-10-01", "0.10"),
        row("b", "2026-11-02", "0.20", "food", "dinner"),
        row("c", "2026-11-03", "1.00", "other", "coffee"),
        row("d", "2026-11-01", "0.30"),
        row("e", "2026-10-31", "0.01", "food", null),
        row("f", "2026-10-30", "0.02", "__uncategorized__", null),
    ]
    const groups = groupBudgetTransactions(rows)
    assert.deepEqual(
        groups.map((g) => g.id),
        ["other", "food", "__uncategorized__"]
    )
    assert.equal(groups[1].total, "0.61")
    assert.deepEqual(
        groups[1].subgroups.map((g) => g.id),
        ["dinner", "coffee", "__direct__"]
    )
    assert.deepEqual(
        groups[1].subgroups[1].rows.map((r) => r.id),
        ["d", "a"]
    )
    assert.equal(groups[1].subgroups[1].total, "0.40")
    assert.equal(groups[2].subgroups[0].name, "Uncategorized")
    assert.equal(rows[0].id, "a")
})
test("grouped view includes more than a flat page and preserves same-day source ordering", () => {
    const rows = Array.from({ length: 205 }, (_, i) =>
        row(String(i), "2026-11-01", "0.01")
    )
    const groups = groupBudgetTransactions(rows)
    assert.equal(groups[0].subgroups[0].rows.length, 205)
    assert.equal(groups[0].total, "2.05")
    assert.deepEqual(
        groups[0].subgroups[0].rows.map((r) => r.id),
        rows.map((r) => r.id)
    )
    assert.deepEqual(groupBudgetTransactions([]), [])
})
test("yearly budget chart details keep the clicked month and grouped results have a separate unpaged cache key", () => {
    const request = (query = {}) =>
        canonicalWorkspaceRequest(
            {
                resource: "budgetTransactions",
                accountId: "a",
                query: {
                    budgetId: "one",
                    cadence: "YEARLY",
                    date: "2026-10-15",
                    mode: "smoothed",
                    ...query,
                },
            },
            "2026-11-13"
        )
    assert.equal(request().query.date, "2026-01-01")
    const monthly = request({ scope: "month" })
    assert.equal(monthly.query.date, "2026-10-01")
    assert.equal(monthly.query.scope, "month")
    assert.notDeepEqual(monthly, request())
    const grouped = request({ scope: "month", grouped: "true", page: "5" })
    assert.equal(grouped.query.page, "0")
    assert.equal(grouped.query.format, "category-groups-v1")
    assert.notDeepEqual(grouped, monthly)
    assert.equal(
        request({ cadence: "WEEKLY", scope: "month" }).query.date,
        "2026-10-01"
    )
})
