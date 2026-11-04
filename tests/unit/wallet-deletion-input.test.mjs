import test from "node:test"
import assert from "node:assert/strict"
import {
    validateWalletDeletionReference,
    validateWalletDeletionInput,
} from "../../src/lib/wallet-deletion-input.ts"
const reference = {
    financialAccountId: "account",
    accountWalletId: "allocation",
}
test("wallet deletion requires a valid resource reference and exact preview fingerprint", () => {
    assert.deepEqual(validateWalletDeletionReference(reference), reference)
    assert.deepEqual(
        validateWalletDeletionInput({
            ...reference,
            expectedSnapshot: "a".repeat(64),
        }),
        { ...reference, expectedSnapshot: "a".repeat(64) }
    )
    for (const value of [
        null,
        [],
        {},
        { ...reference, accountWalletId: "" },
        { ...reference, financialAccountId: "a".repeat(129) },
    ])
        assert.equal(validateWalletDeletionReference(value), null)
    for (const expectedSnapshot of [
        undefined,
        "",
        "a".repeat(63),
        "x".repeat(64),
        123,
    ])
        assert.equal(
            validateWalletDeletionInput({ ...reference, expectedSnapshot }),
            null
        )
})
