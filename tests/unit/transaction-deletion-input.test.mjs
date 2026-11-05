import test from "node:test"
import assert from "node:assert/strict"
import {
    validateDeletionReference,
    validDeletionSnapshot,
} from "../../src/lib/transaction-deletion-input.ts"
const reference = {
    financialAccountId: "account",
    transactionId: "transaction",
    expectedVersion: 1,
    scope: "ONLY",
}
test("recurring deletion accepts only explicit supported scopes and bounded references", () => {
    for (const scope of ["ONLY", "FUTURE", "ALL"])
        assert.deepEqual(
            validateDeletionReference({ ...reference, scope, ignored: true }),
            { ...reference, scope }
        )
    for (const value of [
        null,
        [],
        {},
        { ...reference, scope: "all" },
        { ...reference, scope: "INVALID" },
        { ...reference, expectedVersion: "1" },
        { ...reference, expectedVersion: 0 },
        { ...reference, expectedVersion: 1.5 },
        { ...reference, expectedVersion: 2147483647 },
        { ...reference, financialAccountId: "" },
        { ...reference, transactionId: "x".repeat(129) },
    ])
        assert.equal(validateDeletionReference(value), null)
})
test("confirmation snapshot must match an exact server fingerprint shape", () => {
    assert.equal(validDeletionSnapshot("a".repeat(64)), true)
    for (const value of [
        null,
        undefined,
        "",
        "a".repeat(63),
        "g".repeat(64),
        42,
    ])
        assert.equal(validDeletionSnapshot(value), false)
})
