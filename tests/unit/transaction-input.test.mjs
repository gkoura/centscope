import test from "node:test"
import assert from "node:assert/strict"
import {
    validateTransactionInput,
    validateStatusInput,
} from "../../src/lib/transaction-input.ts"

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
        "13,591",
        "0,00",
        "1,000",
        "1.234,56",
        "1,234.56",
        "13,,59",
        "13,5,9",
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
test("accepts decimal commas for expense and income without losing cents or storage-limit precision", () => {
    for (const type of ["EXPENSE", "INCOME"]) {
        for (const [amount, expected] of [
            ["13,59", "13.59"],
            ["13,5", "13.50"],
            [" 0,01 ", "0.01"],
            ["9999999999999999,99", "9999999999999999.99"],
        ]) {
            assert.equal(
                validateTransactionInput(form({ type, amount })).data?.amount,
                expected
            )
        }
    }
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

test("delete references require bounded account/transaction IDs and a positive version without a status", async () => {
    const { validateTransactionReference } =
        await import("../../src/lib/transaction-input.ts")
    const valid = new FormData()
    valid.set("financialAccountId", "account")
    valid.set("transactionId", "transaction")
    valid.set("expectedVersion", "2")
    assert.deepEqual(validateTransactionReference(valid), {
        financialAccountId: "account",
        transactionId: "transaction",
        expectedVersion: 2,
    })
    for (const [field, value] of [
        ["financialAccountId", ""],
        ["transactionId", "x".repeat(129)],
        ["expectedVersion", "0"],
        ["expectedVersion", "-1"],
        ["expectedVersion", "1.5"],
        ["expectedVersion", "2147483647"],
    ]) {
        const malformed = new FormData()
        for (const [key, entry] of valid) malformed.set(key, entry)
        malformed.set(field, value)
        assert.equal(validateTransactionReference(malformed), null)
    }
})
