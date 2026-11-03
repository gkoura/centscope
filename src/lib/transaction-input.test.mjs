import test from "node:test"
import assert from "node:assert/strict"
import {
    validateTransactionInput,
    validateStatusInput,
} from "./transaction-input.ts"

function form(overrides = {}) {
    const data = new FormData()
    for (const [key, value] of Object.entries({
        financialAccountId: "account",
        accountWalletId: "allocation",
        categoryId: "food",
        requestId: "6fde415d-23ec-453e-b24c-65c8cd005bf0",
        type: "EXPENSE",
        name: "Groceries",
        amount: "12.5",
        date: "2026-11-03",
        status: "POSTED",
        notes: "",
        ...overrides,
    }))
        data.set(key, value)
    return data
}
test("canonicalizes positive money exactly, including the storage limit", () => {
    assert.equal(validateTransactionInput(form()).data?.amount, "12.50")
    assert.equal(
        validateTransactionInput(form({ amount: "9999999999999999.99" })).data
            ?.amount,
        "9999999999999999.99"
    )
    assert.equal(validateTransactionInput(form()).data?.notes, null)
})
test("rejects negative, zero, over-precision, overflow and non-finite transaction amounts", () => {
    for (const amount of [
        "-1.00",
        "0",
        "0.00",
        "0.001",
        "10000000000000000",
        "1e3",
        "NaN",
        "Infinity",
        "",
    ])
        assert.ok(
            validateTransactionInput(form({ amount })).errors?.amount,
            amount
        )
})
test("requires a category and valid date while keeping status independent of date", () => {
    assert.ok(
        validateTransactionInput(form({ categoryId: "" })).errors?.categoryId
    )
    assert.ok(
        validateTransactionInput(form({ date: "2026-02-30" })).errors?.date
    )
    assert.equal(
        validateTransactionInput(form({ date: "2099-12-31", status: "POSTED" }))
            .data?.status,
        "POSTED"
    )
    assert.equal(
        validateTransactionInput(
            form({ date: "2000-01-01", status: "PENDING", type: "INCOME" })
        ).data?.status,
        "PENDING"
    )
    assert.ok(
        validateTransactionInput(form({ notes: "x".repeat(2001) })).errors
            ?.notes
    )
})
test("status writes require explicit status and bounded positive version", () => {
    const data = new FormData()
    data.set("financialAccountId", "account")
    data.set("transactionId", "transaction")
    data.set("status", "POSTED")
    data.set("expectedVersion", "1")
    assert.equal(validateStatusInput(data)?.expectedVersion, 1)
    for (const version of ["0", "-1", "1.5", "2147483647", "NaN"]) {
        data.set("expectedVersion", version)
        assert.equal(validateStatusInput(data), null)
    }
})
