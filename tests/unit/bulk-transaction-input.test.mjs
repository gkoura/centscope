import test from "node:test"
import assert from "node:assert/strict"
import {
    parseBulkInput,
    MAX_BULK_SELECTED,
} from "../../src/lib/bulk-transaction-input.ts"
const valid = {
    accountId: "account",
    requestId: "71bfc6d7-6b8e-4c60-84d5-1bfaf22132e3",
    selected: [
        { id: "b", version: 1 },
        { id: "a", version: 2 },
    ],
    operation: "POSTED",
    scope: "ONLY",
    targetId: "ignored",
    fx: [],
}
test("bulk references are canonical, versioned and bounded without duplicate selections", () => {
    assert.deepEqual(parseBulkInput(valid).selected, [
        { id: "a", version: 2 },
        { id: "b", version: 1 },
    ])
    assert.equal(parseBulkInput(valid).targetId, "")
    for (const extra of [
        { selected: [] },
        { selected: [{ id: "a", version: 0 }] },
        {
            selected: [
                { id: "a", version: 1 },
                { id: "a", version: 1 },
            ],
        },
        {
            selected: Array.from({ length: MAX_BULK_SELECTED + 1 }, (_, i) => ({
                id: "a" + i,
                version: 1,
            })),
        },
        { scope: "PAST" },
        { operation: "UPDATE" },
        { requestId: "bad" },
        { accountId: "../foreign" },
        { operation: "CATEGORY", targetId: "" },
    ])
        assert.throws(() => parseBulkInput({ ...valid, ...extra }))
})
test("bulk scope and replacement choices are explicit and exact FX strings cannot be rounded silently", () => {
    for (const scope of ["ONLY", "FUTURE", "ALL"])
        assert.equal(parseBulkInput({ ...valid, scope }).scope, scope)
    for (const operation of ["CATEGORY", "WALLET"])
        assert.equal(
            parseBulkInput({ ...valid, operation, targetId: "new" }).targetId,
            "new"
        )
    assert.deepEqual(
        parseBulkInput({
            ...valid,
            fx: [{ id: "fx", sent: "100", received: "83.5" }],
        }).fx,
        [{ id: "fx", sent: "100.00", received: "83.50" }]
    )
    for (const amount of ["0", "-1", "1.001", "Infinity"])
        assert.throws(() =>
            parseBulkInput({
                ...valid,
                fx: [{ id: "fx", sent: amount, received: "85" }],
            })
        )
    assert.throws(() =>
        parseBulkInput({
            ...valid,
            fx: [
                { id: "fx", sent: "10", received: "8" },
                { id: "fx", sent: "10", received: "8" },
            ],
        })
    )
})
