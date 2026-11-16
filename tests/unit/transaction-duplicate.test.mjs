import test from "node:test"
import assert from "node:assert/strict"
import {
    transactionCopy,
    transferCopy,
    validCopyIntent,
} from "../../src/lib/transaction-duplicate.ts"

const source = {
    id: "original",
    idempotencyKey: "original-request",
    createdById: "original-creator",
    version: 7,
    recurrence: { ruleId: "series" },
    name: "Gym",
    notes: "Original note",
    type: "EXPENSE",
    status: "POSTED",
    amount: "300.01",
    date: "2025-12-20",
    accountWalletId: "bank",
    categoryId: "gym",
    spread: { startMonth: "2025-12", monthCount: 6 },
}

test("each explicit copy intent has a validated stable request identity", () => {
    assert.equal(validCopyIntent("174ecf81-1700-4b6a-890a-5b2f86e68991"), true)
    for (const value of [
        undefined,
        "",
        "../copy",
        "2027-01-15",
        ["174ecf81-1700-4b6a-890a-5b2f86e68991"],
    ])
        assert.equal(validCopyIntent(value), false)
})

test("a duplicate is a standalone draft on the chosen date, with exact money and rebased spreading", () => {
    const copy = transactionCopy(source, "2026-01-15")
    assert.deepEqual(copy, {
        name: "Gym",
        notes: "Original note",
        status: "POSTED",
        amount: "300.01",
        date: "2026-01-15",
        type: "EXPENSE",
        accountWalletId: "bank",
        categoryId: "gym",
        spread: { startMonth: "2026-01", monthCount: 6 },
    })
    assert.equal(source.spread.startMonth, "2025-12")
    assert.equal(source.date, "2025-12-20")
    assert.deepEqual(
        transactionCopy(
            { ...source, type: "INCOME", status: "PENDING", spread: null },
            "2024-02-29"
        ).spread,
        null
    )
    assert.throws(() => transactionCopy(source, "2026-02-30"))
})

test("transfer copies retain exact sent/received amounts and endpoints without transaction or recurrence identities", () => {
    const copy = transferCopy(
        {
            ...source,
            sourceId: "bank",
            destinationId: "cash",
            amount: "9999999999999999.99",
            destinationAmount: "8523678923456789.01",
        },
        "2026-12-31"
    )
    assert.deepEqual(copy, {
        name: "Gym",
        notes: "Original note",
        status: "POSTED",
        date: "2026-12-31",
        amount: "9999999999999999.99",
        sourceId: "bank",
        destinationId: "cash",
        destinationAmount: "8523678923456789.01",
    })
    assert.throws(() => transferCopy({ ...copy }, "0000-01-01"))
})
