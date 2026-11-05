import test from "node:test"
import assert from "node:assert/strict"
import {
    positiveTransferMoney,
    validateTransferInput,
    transferRate,
} from "../../src/lib/transfer-input.ts"
import { parseTransactionFilters } from "../../src/lib/transaction-filters.ts"
function form(extra = {}) {
    const f = new FormData()
    for (const [k, v] of Object.entries({
        contextAccountId: "account",
        sourceId: "bank",
        destinationId: "cash",
        amount: "100",
        date: "2026-11-04",
        status: "POSTED",
        requestId: "6fde415d-23ec-453e-b24c-65c8cd005bf0",
        ...extra,
    }))
        f.set(k, v)
    return f
}
test("transfer money is canonical and exact up to the existing storage limit", () => {
    assert.equal(
        positiveTransferMoney("9999999999999999.99"),
        "9999999999999999.99"
    )
    assert.equal(positiveTransferMoney("1.2"), "1.20")
    assert.equal(positiveTransferMoney("0.01"), "0.01")
    for (const value of [
        "0",
        "0.00",
        "-1",
        "1.001",
        "NaN",
        "Infinity",
        "1e3",
        "1,000",
        "10000000000000000",
    ])
        assert.equal(positiveTransferMoney(value), null)
})
test("transfer form requires separate allocations, positive amounts and explicit status", () => {
    assert.equal(validateTransferInput(form()).data.name, "Transfer")
    assert.equal(validateTransferInput(form()).data.amount, "100.00")
    for (const extra of [
        { sourceId: "cash" },
        { amount: "-1" },
        { status: "posted" },
        { date: "2026-02-30" },
        { destinationAmount: "0" },
        { requestId: "bad" },
    ])
        assert.ok(validateTransferInput(form(extra)).errors)
    assert.equal(
        validateTransferInput(form({ destinationAmount: "85" })).data
            .destinationAmount,
        "85.00"
    )
})
test("transfer series editing requires confirmation and a series version", () => {
    assert.ok(
        validateTransferInput(form({ editScope: "ALL" })).errors.editScope
    )
    const data = validateTransferInput(
        form({
            editScope: "ALL",
            seriesConfirmed: "yes",
            expectedRuleVersion: "1",
        })
    ).data
    assert.equal(data.editScope, "ALL")
})
test("exchange rate display uses exact integer arithmetic without floating point", () => {
    assert.equal(transferRate("100", "85"), "0.85")
    assert.equal(transferRate("3", "1"), "0.33333333")
    assert.equal(transferRate("1", "10"), "10")
    assert.equal(transferRate("0", "1"), null)
    assert.equal(
        transferRate("9999999999999999.99", "9999999999999999.99"),
        "1"
    )
})
test("history filters accept Transfers without relaxing existing case-sensitive enums", () => {
    assert.equal(parseTransactionFilters({ type: "TRANSFER" }).type, "TRANSFER")
    assert.equal(parseTransactionFilters({ type: "transfer" }).type, undefined)
})
