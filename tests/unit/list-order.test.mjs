import test from "node:test"
import assert from "node:assert/strict"
import { validateListOrder, sameOrder } from "../../src/lib/list-order.ts"

test("account and wallet order accepts only complete unique ID permutations", () => {
    const input = { previousIds: ["a", "b", "c"], orderedIds: ["c", "a", "b"] }
    assert.deepEqual(validateListOrder(input), input)
    for (const raw of [
        null,
        [],
        "invalid",
        { ...input, previousIds: [] },
        { ...input, orderedIds: ["a", "b"] },
        { ...input, orderedIds: ["a", "b", "foreign"] },
        { ...input, orderedIds: ["a", "a", "c"] },
        { ...input, previousIds: ["a", "a", "c"] },
        { ...input, orderedIds: ["a", null, "c"] },
    ])
        assert.equal(validateListOrder(raw), null)
    assert.ok(validateListOrder({ previousIds: ["a"], orderedIds: ["a"] }))
})

test("saved order comparison detects reorders, creations, removal and foreign IDs", () => {
    assert.equal(sameOrder(["a", "b"], ["a", "b"]), true)
    for (const current of [
        ["b", "a"],
        ["a"],
        ["a", "b", "c"],
        ["a", "foreign"],
    ])
        assert.equal(sameOrder(current, ["a", "b"]), false)
})
