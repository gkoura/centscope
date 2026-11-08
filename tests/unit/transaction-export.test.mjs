import test from "node:test"
import assert from "node:assert/strict"
import {
    transactionsCsv,
    transactionExportColumns,
    csvCell,
} from "../../src/lib/transaction-export.ts"
import { parseCsv } from "../../src/lib/transaction-import.ts"
const expense = {
    id: "expense",
    date: "2026-11-08",
    name: "Gym",
    type: "EXPENSE",
    status: "POSTED",
    amount: "-300.00",
    currency: "EUR",
    walletName: "Bank",
    notes: null,
    categoryName: "Health",
    subcategoryName: "Gym",
    expenseSpread: { startMonth: "2026-11", monthCount: 6 },
    occurrence: { ruleId: "series" },
    transfer: null,
}
const record = (row) =>
    Object.fromEntries(
        parseCsv(transactionsCsv([row]))
            .slice(1)[0]
            .map((v, i) => [transactionExportColumns[i], v])
    )
test("expense exports payment amount and structured category, spreading and recurrence metadata", () => {
    const r = record(expense)
    assert.equal(r.amount, "300.00")
    assert.equal(r.category, "Health")
    assert.equal(r.subcategory, "Gym")
    assert.equal(r.spread_month_count, "6")
    assert.equal(r.recurring_series_id, "series")
})
test("CSV preserves commas, quotes, multiline notes, Unicode and exact large amounts", () => {
    const r = record({
        ...expense,
        name: 'Καφές, "large"',
        notes: 'first\nsecond, "quoted"',
        amount: "-9999999999999999.99",
    })
    assert.equal(r.name, 'Καφές, "large"')
    assert.equal(r.notes, 'first\nsecond, "quoted"')
    assert.equal(r.amount, "9999999999999999.99")
})
test("transfer is one row with stable source/destination irrespective of wallet-relative amount", () => {
    const csv = transactionsCsv([
        {
            ...expense,
            type: "TRANSFER",
            amount: "85.00",
            currency: "GBP",
            walletName: "Cash",
            categoryName: null,
            subcategoryName: null,
            expenseSpread: null,
            occurrence: null,
            transfer: {
                source: {
                    walletName: "Bank",
                    amount: "100.00",
                    currency: "EUR",
                },
                destination: {
                    walletName: "Cash",
                    amount: "85.00",
                    currency: "GBP",
                },
            },
        },
    ])
    const r = record({
        ...expense,
        type: "TRANSFER",
        categoryName: null,
        subcategoryName: null,
        transfer: {
            source: { walletName: "Bank", amount: "100.00", currency: "EUR" },
            destination: {
                walletName: "Cash",
                amount: "85.00",
                currency: "GBP",
            },
        },
    })
    assert.equal(parseCsv(csv).length, 2)
    assert.equal(r.wallet, "Bank")
    assert.equal(r.amount, "100.00")
    assert.equal(r.destination_amount, "85.00")
    assert.equal(r.destination_currency, "GBP")
})
test("text formulas are neutralized while negative opening balances remain numeric", () => {
    for (const v of [
        "=1+1",
        "+cmd",
        "-cmd",
        "@SUM(A1)",
        "  =1",
        "\tvalue",
        "\rvalue",
    ])
        assert.ok(csvCell(v).startsWith("\"'"))
    assert.equal(
        record({ ...expense, type: "OPENING_BALANCE", amount: "-12.34" })
            .amount,
        "-12.34"
    )
    assert.equal(
        record({ ...expense, name: "=SUM(A1:A2)" }).name,
        "'=SUM(A1:A2)"
    )
})
test("empty export is a UTF-8 BOM and header-only CRLF file", () => {
    assert.equal(
        transactionsCsv([]),
        "\uFEFF" + transactionExportColumns.join(",") + "\r\n"
    )
})
