import test from "node:test"
import assert from "node:assert/strict"
import {
    resolveAccountPeriod,
    periodForMonth,
    periodQuery,
    adjacentPeriod,
    nextDay,
    validDay,
    accountViewSearch,
} from "../../src/lib/account-period.ts"
import {
    transactionReturnPath,
    periodEntryDate,
} from "../../src/lib/transaction-return.ts"
const today = "2026-11-05"
test("month boundaries include leap days and roll across years", () => {
    assert.equal(periodForMonth("2024-02").to, "2024-02-29")
    assert.equal(periodForMonth("2026-12").to, "2026-12-31")
    assert.equal(
        nextDay("2026-12-31").toISOString(),
        "2027-01-01T00:00:00.000Z"
    )
    assert.deepEqual(adjacentPeriod(periodForMonth("2026-12"), 1), {
        view: "month",
        month: "2027-01",
    })
    assert.equal(adjacentPeriod(periodForMonth("0002-01"), -1), null)
    assert.equal(adjacentPeriod(periodForMonth("9998-12"), 1), null)
})
test("periods default safely, validate dates, and preserve explicit ranges", () => {
    assert.equal(resolveAccountPeriod({}, today).month, "2026-11")
    assert.equal(validDay("2026-02-30"), false)
    assert.equal(validDay("2024-02-29"), true)
    for (const query of [
        { view: "year", year: "0" },
        { month: "2026-13" },
        { view: "custom", from: "2026-02-30", to: today },
        { from: today, to: "2025-01-01" },
    ]) {
        const period = resolveAccountPeriod(query, today)
        assert.equal(period.month, "2026-11")
        assert.ok(period.notice)
    }
    const year = resolveAccountPeriod({ view: "year", year: "2025" }, today)
    assert.equal(year.from, "2025-01-01")
    assert.equal(year.to, "2025-12-31")
    const custom = resolveAccountPeriod(
        { from: "2025-12-31", to: "2026-01-02" },
        today
    )
    assert.equal(custom.view, "custom")
    assert.deepEqual(periodQuery(custom), {
        view: "custom",
        from: "2025-12-31",
        to: "2026-01-02",
    })
    assert.equal(adjacentPeriod(custom, 1), null)
})
test("new entries use a date inside the selected period", () => {
    assert.equal(periodEntryDate(periodForMonth("2026-11"), today), today)
    assert.equal(
        periodEntryDate(periodForMonth("2024-02"), today),
        "2024-02-29"
    )
    assert.equal(
        periodEntryDate(periodForMonth("2027-01"), today),
        "2027-01-01"
    )
})
test("return links remain within the same account transaction list", () => {
    const base = "/dashboard/accounts/a/transactions"
    assert.equal(
        transactionReturnPath(base + "?view=year&year=2025", "a"),
        base + "?view=year&year=2025"
    )
    for (const value of [
        "https://evil.test",
        "//evil.test",
        "/dashboard/accounts/b/transactions?x=1",
        base + "/new?x=1",
        base + "?".repeat(5000),
    ])
        assert.equal(transactionReturnPath(value, "a"), base)
    assert.equal(
        transactionReturnPath(null, "a", "2024-02-29"),
        base + "?view=month&month=2024-02"
    )
})

test("account view links preserve the period and leave filters behind", () => {
    const query = new URLSearchParams({
        view: "month",
        month: "2025-03",
        wallet: "private-wallet",
        q: "coffee",
    })
    assert.equal(accountViewSearch(query), "?view=month&month=2025-03")
    assert.equal(accountViewSearch(query, true), "?month=2025-03")
    assert.equal(
        accountViewSearch(
            new URLSearchParams({
                view: "custom",
                from: "2025-04-05",
                to: "2025-06-01",
            }),
            true
        ),
        "?month=2025-04"
    )
})

test("All time ignores stale date parameters and stays selected across account navigation", () => {
    const period = resolveAccountPeriod(
        { view: "all", from: "2000-01-01", to: "2000-02-01", month: "2000-01" },
        today
    )
    assert.equal(period.label, "All time")
    assert.equal(period.from, "")
    assert.equal(period.to, "")
    assert.deepEqual(periodQuery(period), { view: "all" })
    assert.equal(adjacentPeriod(period, -1), null)
    assert.equal(adjacentPeriod(period, 1), null)
    assert.equal(periodEntryDate(period, today), today)
    assert.equal(
        accountViewSearch(
            new URLSearchParams("view=all&month=2000-01&wallet=x")
        ),
        "?view=all"
    )
    assert.equal(
        accountViewSearch(new URLSearchParams("view=all"), true),
        "?view=all"
    )
})
