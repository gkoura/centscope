import test from "node:test"
import assert from "node:assert/strict"
import {
    monthlyTrendBuckets,
    monthlyTrendSeries,
    categoryGroupIds,
    UNCATEGORIZED,
} from "../../src/lib/monthly-trends.ts"
import { canonicalWorkspaceRequest } from "../../src/lib/workspace-cache-policy.ts"
const entry = (overrides = {}) => ({
    type: "EXPENSE",
    amount: "-120.00",
    currency: "EUR",
    month: "2026-01",
    categoryId: "rent",
    spread: null,
    ...overrides,
})
const series = (
    entries,
    {
        mode = "actual",
        selected = null,
        type = "EXPENSE",
        currency = "EUR",
        end = "2026-12",
    } = {}
) =>
    monthlyTrendSeries(
        monthlyTrendBuckets(entries, end),
        end,
        type,
        currency,
        mode,
        selected
    )

test("monthly totals isolate income, expenses and currencies, including zero months", () => {
    const entries = [
        entry(),
        entry({ amount: "-30.50" }),
        entry({ type: "INCOME", amount: "1500.00", categoryId: "salary" }),
        entry({ currency: "USD", amount: "-400.00" }),
    ]
    const result = series(entries)
    assert.equal(result.total, "150.50")
    assert.equal(result.average, "12.54")
    assert.equal(result.points.length, 12)
    assert.equal(result.points[0].amount, "150.50")
    assert.equal(result.points[11].amount, "0.00")
    assert.equal(series(entries, { type: "INCOME" }).total, "1500.00")
    assert.equal(series(entries, { currency: "USD" }).total, "400.00")
})
test("smoothed expenses allocate exact cents across years even when paid outside the window", () => {
    const expenses = [
        entry({
            amount: "-100.00",
            month: "2025-11",
            spread: { startMonth: "2025-11", monthCount: 3 },
        }),
    ]
    assert.equal(series(expenses).total, "0.00")
    assert.equal(series(expenses, { mode: "smoothed" }).total, "33.33")
    assert.equal(
        series(expenses, { mode: "smoothed" }).points[0].amount,
        "33.33"
    )
    const futurePayment = [
        entry({
            amount: "-1200.00",
            month: "2027-01",
            spread: { startMonth: "2026-01", monthCount: 12 },
        }),
    ]
    assert.equal(series(futurePayment, { mode: "smoothed" }).total, "1200.00")
    assert.equal(series(futurePayment).total, "0.00")
})
test("parent filters include direct entries and children without double counting; empty differs from all", () => {
    const categories = [
        { id: "housing", parentId: null },
        { id: "rent", parentId: "housing" },
        { id: "bills", parentId: "housing" },
        { id: "food", parentId: null },
    ]
    const ids = categoryGroupIds(categories[0], categories)
    const entries = [
        entry({ categoryId: "housing", amount: "-10.00" }),
        entry({ amount: "-20.00" }),
        entry({ categoryId: "bills", amount: "-30.00" }),
        entry({ categoryId: null, amount: "-5.00" }),
    ]
    assert.deepEqual(ids, ["housing", "rent", "bills"])
    assert.equal(series(entries, { selected: [...ids, "rent"] }).total, "60.00")
    assert.equal(series(entries, { selected: ["rent"] }).total, "20.00")
    assert.equal(series(entries, { selected: [UNCATEGORIZED] }).total, "5.00")
    assert.equal(series(entries, { selected: [] }).total, "0.00")
    assert.equal(series(entries).total, "65.00")
})
test("rolling ranges cross calendar years and ignore out-of-range entries", () => {
    const result = series(
        [
            entry({ month: "2025-11" }),
            entry({ month: "2025-12" }),
            entry({ month: "2026-12" }),
        ],
        { end: "2026-11" }
    )
    assert.equal(result.points[0].month, "2025-12")
    assert.equal(result.points[11].month, "2026-11")
    assert.equal(result.total, "120.00")
})
test("trends cache scope uses only its own bounded month, independent of page filters", () => {
    const request = canonicalWorkspaceRequest(
        {
            resource: "monthlyTrends",
            accountId: "owned",
            query: {
                month: "2026-12",
                view: "custom",
                from: "2025-01-01",
                category: "salary",
                mode: "actual",
            },
        },
        "2026-11-07"
    )
    assert.deepEqual(request, {
        resource: "monthlyTrends",
        accountId: "owned",
        query: { month: "2026-12" },
    })
    for (const month of ["0001-01", "9999-12", "nonsense"])
        assert.equal(
            canonicalWorkspaceRequest(
                {
                    resource: "monthlyTrends",
                    accountId: "owned",
                    query: { month },
                },
                "2026-11-07"
            ).query.month,
            "2026-11"
        )
})
test("large amounts retain cent precision in totals", () => {
    assert.equal(
        series([
            entry({ amount: "-9999999999999999.99" }),
            entry({ amount: "-0.01" }),
        ]).total,
        "10000000000000000.00"
    )
})

test("rolling trends use the last twelve completed months and handle January rollover", async () => {
    const { trendEndMonth, trendMonths } =
        await import("../../src/lib/monthly-trends.ts")
    assert.equal(trendEndMonth("rolling", "2026-11-07"), "2026-10")
    assert.deepEqual(
        [
            trendMonths(trendEndMonth("rolling", "2026-11-07"))[0],
            trendMonths(trendEndMonth("rolling", "2026-11-07")).at(-1),
        ],
        ["2025-11", "2026-10"]
    )
    assert.equal(trendEndMonth("rolling", "2026-01-01"), "2025-12")
    assert.equal(trendEndMonth("2026", "2026-11-07"), "2026-12")
    const end = trendEndMonth("rolling", "2026-11-30")
    const entries = [
        entry({ month: "2026-10", amount: "-20.00" }),
        entry({ month: "2026-11", amount: "-999.00" }),
    ]
    assert.equal(series(entries, { end }).total, "20.00")
})

test("All time includes full actual and spread lifetimes, gaps and exact averages", async () => {
    const { trendBounds, trendMonths } =
        await import("../../src/lib/monthly-trends.ts")
    const entries = [
        entry({
            month: "2020-12",
            amount: "-100.01",
            spread: { startMonth: "2021-01", monthCount: 3 },
        }),
    ]
    const bounds = trendBounds(entries, "2026-11")
    assert.deepEqual(bounds, { startMonth: "2020-12", endMonth: "2021-03" })
    assert.equal(trendMonths(bounds.endMonth, bounds.startMonth).length, 4)
    const buckets = monthlyTrendBuckets(
        entries,
        bounds.endMonth,
        bounds.startMonth
    )
    const smoothed = monthlyTrendSeries(
        buckets,
        bounds.endMonth,
        "EXPENSE",
        "EUR",
        "smoothed",
        null,
        bounds.startMonth
    )
    const actual = monthlyTrendSeries(
        buckets,
        bounds.endMonth,
        "EXPENSE",
        "EUR",
        "actual",
        null,
        bounds.startMonth
    )
    assert.equal(smoothed.total, "100.01")
    assert.equal(actual.total, "100.01")
    assert.equal(smoothed.average, "25.00")
    assert.deepEqual(
        smoothed.points.map((p) => p.amount),
        ["0.00", "33.34", "33.34", "33.33"]
    )
    assert.deepEqual(trendBounds([], "2026-11"), {
        startMonth: "2026-11",
        endMonth: "2026-11",
    })
    const gap = trendBounds(
        [entry({ month: "2010-01" }), entry({ month: "2026-11" })],
        "2026-11"
    )
    assert.equal(trendMonths(gap.endMonth, gap.startMonth).length, 203)
})
