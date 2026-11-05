import test from "node:test"
import assert from "node:assert/strict"
import {
    summarizeActivity,
    balanceTotals,
} from "../../src/lib/account-summary.ts"
const entry = (values = {}) => ({
    transactionId: "one",
    type: "EXPENSE",
    status: "POSTED",
    amount: "-10.15",
    walletId: "bank",
    walletName: "Bank",
    currency: "EUR",
    category: "Food",
    ...values,
})
test("period totals separate currencies, statuses, and wallet flows", () => {
    const entries = [
        entry(),
        entry({ transactionId: "two", type: "INCOME", amount: "20.25" }),
        entry({ transactionId: "three", status: "PENDING", amount: "-4.01" }),
        entry({
            transactionId: "four",
            currency: "GBP",
            walletId: "cash",
            amount: "-2.00",
        }),
    ]
    const summary = summarizeActivity(entries)
    assert.equal(summary.count, 4)
    assert.equal(summary.pendingCount, 1)
    assert.equal(summary.postedCount, 3)
    assert.deepEqual(summary.currencies, [
        {
            currency: "EUR",
            income: "20.25",
            expenses: "10.15",
            net: "10.10",
            pending: "-4.01",
        },
        {
            currency: "GBP",
            income: "0.00",
            expenses: "2.00",
            net: "-2.00",
            pending: "0.00",
        },
    ])
    assert.equal(summary.wallets[0].expenses, "10.15")
    assert.equal(
        summarizeActivity(entries, "PENDING").currencies[0].expenses,
        "4.01"
    )
})
test("internal transfers count once without becoming income or spending", () => {
    const summary = summarizeActivity([
        entry({ type: "TRANSFER", amount: "-10.00", category: null }),
        entry({
            type: "TRANSFER",
            amount: "10.00",
            walletId: "cash",
            category: null,
        }),
        entry({
            transactionId: "opening",
            type: "OPENING_BALANCE",
            amount: "100.00",
            category: null,
        }),
    ])
    assert.equal(summary.count, 2)
    assert.equal(summary.currencies[0].income, "0.00")
    assert.equal(summary.currencies[0].expenses, "0.00")
    assert.deepEqual(summary.categories, [])
})
test("money totals remain exact above Number safe integer precision", () => {
    assert.deepEqual(
        balanceTotals([
            { currency: "EUR", balance: "9999999999999999.99" },
            { currency: "EUR", balance: "0.01" },
            { currency: "GBP", balance: "-1.01" },
        ]),
        [
            { currency: "EUR", amount: "10000000000000000.00" },
            { currency: "GBP", amount: "-1.01" },
        ]
    )
    assert.equal(
        summarizeActivity([entry(), entry({ transactionId: "two" })])
            .categories[0].amount,
        "20.30"
    )
    assert.deepEqual(balanceTotals([]), [])
})

test("overview spending combines subcategories under their parent category", () => {
    const summary = summarizeActivity([
        entry({ category: "Food / Lunch", parentCategory: "Food" }),
        entry({
            transactionId: "two",
            category: "Food / Coffee",
            parentCategory: "Food",
            amount: "-2.85",
        }),
        entry({
            transactionId: "three",
            category: "Food",
            parentCategory: "Food",
            amount: "-1.00",
        }),
    ])
    assert.deepEqual(summary.categories, [
        { name: "Food", currency: "EUR", amount: "14.00" },
    ])
})
