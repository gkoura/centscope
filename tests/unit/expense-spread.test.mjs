import test from "node:test"
import assert from "node:assert/strict"
import {
    monthlyShare,
    moneyCents,
    centsMoney,
    shiftMonth,
    validSpread,
} from "../../src/lib/expense-spread.ts"
import { analyzeMonth } from "../../src/lib/monthly-analysis.ts"
import { validateTransactionInput } from "../../src/lib/transaction-input.ts"

test("six gym allocations equal the original payment without ledger movements", () => {
    const spread = { startMonth: "2026-11", monthCount: 6 }
    let total = BigInt(0)
    for (let i = 0; i < 6; i++) {
        const share = monthlyShare(
            "300.00",
            spread,
            shiftMonth(spread.startMonth, i)
        )
        assert.equal(share, "50.00")
        total += moneyCents(share)
    }
    assert.equal(centsMoney(total), "300.00")
    assert.equal(monthlyShare("300.00", spread, "2026-10"), "0.00")
    assert.equal(monthlyShare("300.00", spread, "2027-05"), "0.00")
})
test("cent remainders go to earliest months, including tiny and huge amounts", () => {
    for (const amount of ["100.00", "0.01", "9999999999999999.99"]) {
        const spread = { startMonth: "2025-12", monthCount: 120 }
        const shares = Array.from({ length: 120 }, (_, i) =>
            moneyCents(
                monthlyShare(amount, spread, shiftMonth(spread.startMonth, i))
            )
        )
        assert.equal(
            shares.reduce((a, b) => a + b, BigInt(0)),
            moneyCents(amount)
        )
        assert.ok(shares[0] >= shares[119])
        assert.ok(shares[0] - shares[119] <= BigInt(1))
    }
})
test("validates schedules and year boundaries", () => {
    assert.equal(shiftMonth("2026-12", 1), "2027-01")
    assert.equal(shiftMonth("2026-01", -1), "2025-12")
    for (const spread of [
        { startMonth: "2026-13", monthCount: 6 },
        { startMonth: "0000-01", monthCount: 6 },
        { startMonth: "9999-12", monthCount: 2 },
        { startMonth: "2026-01", monthCount: 1 },
        { startMonth: "2026-01", monthCount: 121 },
        { startMonth: "2026-01", monthCount: 2.5 },
    ])
        assert.equal(validSpread(spread), false)
})
const expense = {
    id: "gym",
    name: "Gym",
    amount: "300.00",
    date: "2026-11-01",
    currency: "EUR",
    category: "Recurring / Gym",
    walletName: "Bank",
    spread: { startMonth: "2026-11", monthCount: 6 },
}
test("report substitutes shares without double counting, separates future costs, and retains payment view", () => {
    assert.equal(
        analyzeMonth([expense], "2026-11", "smoothed", "2026-11-04").total,
        "50.00"
    )
    assert.equal(
        analyzeMonth([expense], "2026-11", "actual", "2026-11-04").total,
        "300.00"
    )
    const future = analyzeMonth([expense], "2026-12", "smoothed", "2026-11-04")
    assert.equal(future.total, "0.00")
    assert.equal(future.planned, "50.00")
    assert.deepEqual(future.categories, [])
    assert.equal(
        analyzeMonth([expense], "2026-12", "actual", "2026-11-04").rows.length,
        0
    )
    const ordinary = {
        ...expense,
        id: "ordinary",
        amount: "20.00",
        spread: null,
    }
    const report = analyzeMonth(
        [expense, ordinary],
        "2026-11",
        "smoothed",
        "2026-11-04"
    )
    assert.equal(report.total, "70.00")
    assert.equal(report.categories[0].amount, "70.00")
    assert.equal(
        analyzeMonth(
            [{ ...expense, date: "2026-11-20" }],
            "2026-11",
            "smoothed",
            "2026-11-04"
        ).planned,
        "50.00"
    )
})
test("historical starts and changed amounts are reflected; removing spread restores payment", () => {
    const changed = {
        ...expense,
        amount: "360.00",
        spread: { startMonth: "2026-09", monthCount: 6 },
    }
    assert.equal(
        analyzeMonth([changed], "2026-10", "smoothed", "2026-11-04").total,
        "60.00"
    )
    assert.equal(
        analyzeMonth(
            [{ ...changed, spread: null }],
            "2026-10",
            "smoothed",
            "2026-11-04"
        ).total,
        "0.00"
    )
    assert.equal(
        analyzeMonth(
            [{ ...changed, spread: null }],
            "2026-11",
            "smoothed",
            "2026-11-04"
        ).total,
        "360.00"
    )
})
test("form validates split and clears income settings", () => {
    const form = new FormData()
    for (const [key, value] of Object.entries({
        financialAccountId: "account",
        accountWalletId: "wallet",
        categoryId: "category",
        requestId: "6fde415d-23ec-453e-b24c-65c8cd005bf0",
        type: "EXPENSE",
        name: "Gym",
        amount: "300",
        date: "2026-11-01",
        status: "POSTED",
        spreadEnabled: "on",
        spreadStartMonth: "2026-11",
        spreadMonthCount: "6",
    }))
        form.set(key, value)
    assert.deepEqual(validateTransactionInput(form).data.spread, {
        startMonth: "2026-11",
        monthCount: 6,
    })
    form.set("spreadMonthCount", "121")
    assert.ok(validateTransactionInput(form).errors.spread)
    form.set("type", "INCOME")
    assert.equal(validateTransactionInput(form).data.spread, undefined)
})
