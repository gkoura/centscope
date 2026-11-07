import test from "node:test"
import assert from "node:assert/strict"
import { smoothedBalanceHistory } from "../../src/lib/smoothed-balance.ts"
import {
    monthlyShare,
    moneyCents,
    centsMoney,
} from "../../src/lib/expense-spread.ts"
const entry = (values = {}) => ({
    type: "EXPENSE",
    status: "POSTED",
    amount: "-120.00",
    currency: "EUR",
    date: "2026-01-10",
    spread: null,
    ...values,
})
const point = (entries, month, currency = "EUR") =>
    smoothedBalanceHistory(entries, month, [currency])[0].points.at(-1).balance

test("balance replaces a spread cash payment with cumulative monthly allocations", () => {
    const entries = [
        entry({
            type: "OPENING_BALANCE",
            amount: "1000.00",
            date: "2025-12-01",
        }),
        entry({ type: "INCOME", amount: "100.00" }),
        entry({ spread: { startMonth: "2026-01", monthCount: 3 } }),
        entry({ amount: "-10.00", date: "2026-02-03" }),
    ]
    assert.equal(point(entries, "2026-01"), "1060.00")
    assert.equal(point(entries, "2026-02"), "1010.00")
    assert.equal(point(entries, "2026-03"), "970.00")
    assert.equal(point(entries, "2026-04"), "970.00")
})
test("cent remainder allocation matches monthlyShare exactly, including payments before and after their schedule", () => {
    for (const amount of ["100.00", "0.01", "9999999999999999.99"]) {
        const spread = { startMonth: "2026-01", monthCount: 3 }
        const entries = [
            entry({ amount: "-" + amount, date: "2027-01-01", spread }),
        ]
        let allocated = 0n
        for (const month of ["2026-01", "2026-02", "2026-03"]) {
            allocated += moneyCents(monthlyShare(amount, spread, month))
            assert.equal(point(entries, month), centsMoney(-allocated))
        }
        assert.equal(point(entries, "2025-12"), "0.00")
    }
})
test("opening history, transfers, status and currency retain ledger semantics", () => {
    const entries = [
        entry({ type: "OPENING_BALANCE", amount: "50.00", date: "2020-01-01" }),
        entry({ type: "TRANSFER", amount: "-10.00" }),
        entry({ type: "TRANSFER", amount: "10.00" }),
        entry({ type: "TRANSFER", amount: "-5.00" }),
        entry({ amount: "-100.00", status: "PENDING" }),
        entry({ currency: "GBP", amount: "-2.50" }),
        entry({ amount: "-1.00", date: "2026-02-01" }),
    ]
    assert.equal(point(entries, "2026-01"), "45.00")
    assert.equal(point(entries, "2026-01", "GBP"), "-2.50")
    assert.equal(point(entries, "2026-02"), "44.00")
    const series = smoothedBalanceHistory(entries, "2026-01", [
        "EUR",
        "GBP",
        "EUR",
    ])
    assert.equal(series.length, 2)
    assert.equal(series[0].points.length, 11)
    assert.equal(series[0].points[0].month, "2025-03")
    assert.equal(point([], "2026-01"), "0.00")
})

test("balance history always includes eleven consecutive months and retains older opening balances", () => {
    const series = smoothedBalanceHistory(
        [
            entry({
                type: "OPENING_BALANCE",
                amount: "1000.00",
                date: "2020-01-01",
            }),
            entry({ amount: "-5.00", date: "2026-11-01" }),
        ],
        "2026-10",
        ["EUR"]
    )[0]
    assert.equal(series.points.length, 11)
    assert.equal(series.points[0].month, "2025-12")
    assert.equal(series.points.at(-1).month, "2026-10")
    assert.equal(
        series.points.every((point) => point.balance === "1000.00"),
        true
    )
    const january = smoothedBalanceHistory([], "2025-12", ["EUR"])[0]
    assert.equal(january.points.length, 11)
    assert.equal(january.points[0].month, "2025-02")
    assert.equal(january.points.at(-1).month, "2025-12")
})
