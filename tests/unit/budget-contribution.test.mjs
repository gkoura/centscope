import test from "node:test"
import assert from "node:assert/strict"
import { budgetContribution } from "../../src/lib/budget-contribution.ts"
import { budgetPeriod } from "../../src/lib/budget-period.ts"
import { moneyCents, monthlyShare } from "../../src/lib/expense-spread.ts"
import { canonicalWorkspaceRequest } from "../../src/lib/workspace-cache-policy.ts"

const monthly = budgetPeriod("MONTHLY", "2024-02-15")
const spread = { startMonth: "2024-01", monthCount: 3 }
test("Actual uses the payment date and exclusive period end, even for spread expenses", () => {
    assert.equal(
        budgetContribution("100.00", "2024-02-01", spread, monthly, "actual")
            .amount,
        "100.00"
    )
    for (const date of ["2024-01-31", "2024-03-01"])
        assert.equal(
            budgetContribution("100.00", date, spread, monthly, "actual")
                .amount,
            "0.00"
        )
    assert.equal(
        budgetContribution("100.00", "2024-02-29", null, monthly, "smoothed")
            .amount,
        "100.00"
    )
})
test("Smoothed monthly contributions match Analytics and count payments outside the period", () => {
    const result = budgetContribution(
        "100.00",
        "2023-12-01",
        spread,
        monthly,
        "smoothed"
    )
    assert.equal(result.amount, monthlyShare("100.00", spread, "2024-02"))
    assert.deepEqual(result.allocations, [
        {
            month: "2024-02",
            monthlyAmount: "33.33",
            contribution: "33.33",
            from: "2024-02-01",
            until: "2024-03-01",
        },
    ])
    assert.equal(
        budgetContribution(
            "100.00",
            "2024-04-01",
            spread,
            budgetPeriod("MONTHLY", "2024-04-01"),
            "smoothed"
        ).amount,
        "0.00"
    )
})
test("Every daily allocation sums to the exact monthly share, including leap days and tiny amounts", () => {
    for (const amount of [
        "0.01",
        "0.30",
        "1.00",
        "100.00",
        "999999999999.99",
    ]) {
        const oneMonth = { startMonth: "2024-02", monthCount: 1 }
        let sum = 0n
        for (let day = 1; day <= 29; day++) {
            const period = budgetPeriod(
                "DAILY",
                `2024-02-${String(day).padStart(2, "0")}`
            )
            sum += moneyCents(
                budgetContribution(
                    amount,
                    "2023-01-01",
                    oneMonth,
                    period,
                    "smoothed"
                ).amount
            )
        }
        assert.equal(sum, moneyCents(amount))
    }
})
test("Cross-month weeks sum partial allocations and cross-year totals conserve the entire payment", () => {
    const crossYear = { startMonth: "2024-12", monthCount: 2 }
    const week = budgetContribution(
        "100.01",
        "2024-01-01",
        crossYear,
        budgetPeriod("WEEKLY", "2025-01-01"),
        "smoothed"
    )
    assert.equal(week.allocations.length, 2)
    let days = 0n
    for (
        let date = new Date("2024-12-30T00:00:00Z");
        date < new Date("2025-01-06T00:00:00Z");
        date.setUTCDate(date.getUTCDate() + 1)
    )
        days += moneyCents(
            budgetContribution(
                "100.01",
                "2024-01-01",
                crossYear,
                budgetPeriod("DAILY", date.toISOString().slice(0, 10)),
                "smoothed"
            ).amount
        )
    assert.equal(moneyCents(week.amount), days)
    const yearly = ["2024-01-01", "2025-01-01"].map((day) =>
        budgetContribution(
            "100.01",
            "2024-01-01",
            crossYear,
            budgetPeriod("YEARLY", day),
            "smoothed"
        )
    )
    assert.equal(
        yearly.reduce((sum, row) => sum + moneyCents(row.amount), 0n),
        10001n
    )
})

test("Detail cache keys normalize periods while separating budget, page, mode and account", () => {
    const request = (query = {}, accountId = "a") =>
        canonicalWorkspaceRequest(
            {
                resource: "budgetTransactions",
                accountId,
                query: {
                    budgetId: "one",
                    cadence: "MONTHLY",
                    date: "2024-02-29",
                    ...query,
                },
            },
            "2024-02-15"
        )
    assert.deepEqual(
        request(),
        request({ date: "2024-02-01", mode: "actual", page: "0" })
    )
    for (const query of [
        { budgetId: "two" },
        { mode: "smoothed" },
        { page: "1" },
        { date: "2024-03-01" },
    ])
        assert.notDeepEqual(request(), request(query))
    assert.notDeepEqual(request(), request({}, "b"))
})
