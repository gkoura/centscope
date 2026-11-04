import test from "node:test"
import assert from "node:assert/strict"
import {
    creationHorizon,
    firstIndexAfter,
    scheduleDate,
    nextSlot,
    localToday,
    validRepeat,
    readRepeat,
} from "../../src/lib/recurrence-input.ts"
import { validateTransactionInput } from "../../src/lib/transaction-input.ts"
const rule = {
    frequency: "MONTHLY",
    interval: 1,
    timezone: "Europe/Athens",
    endsOn: null,
    endAfter: null,
    occurrenceStatus: "PENDING",
}
test("month end clamps without drift and yearly leap days recover", () => {
    assert.deepEqual(
        [0, 1, 2, 3].map((i) => scheduleDate("2026-01-31", "MONTHLY", 1, i)),
        ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]
    )
    assert.equal(scheduleDate("2024-02-29", "YEARLY", 1, 1), "2025-02-28")
    assert.equal(scheduleDate("2024-02-29", "YEARLY", 1, 4), "2028-02-29")
    assert.equal(scheduleDate("2026-12-31", "WEEKLY", 2, 1), "2027-01-14")
    assert.equal(scheduleDate("2026-01-31", "MONTHLY", 3, 1), "2026-04-30")
    assert.equal(scheduleDate("9999-12-31", "DAILY", 1, 1), null)
})
test("ending includes first slot and date boundary, skipped dates consume slots", () => {
    assert.equal(
        nextSlot("2026-01-31", { ...rule, endAfter: 3 }, 2),
        "2026-03-31"
    )
    assert.equal(nextSlot("2026-01-31", { ...rule, endAfter: 3 }, 3), null)
    assert.equal(
        nextSlot("2026-01-31", { ...rule, endsOn: "2026-02-28" }, 1),
        "2026-02-28"
    )
    assert.equal(
        nextSlot("2026-01-31", { ...rule, endsOn: "2026-02-28" }, 2),
        null
    )
})
test("local calendar dates cross UTC midnight and DST safely", () => {
    assert.equal(
        localToday("Europe/Athens", new Date("2026-11-04T22:30:00Z")),
        "2026-11-05"
    )
    assert.equal(
        localToday("America/Los_Angeles", new Date("2026-11-04T00:30:00Z")),
        "2026-11-03"
    )
    assert.equal(scheduleDate("2026-03-28", "DAILY", 1, 1), "2026-03-29")
    assert.equal(scheduleDate("2026-03-28", "DAILY", 1, 2), "2026-03-30")
})
test("rejects malformed schedules and ambiguous endings", () => {
    assert.equal(validRepeat(rule, "2026-01-31"), true)
    for (const patch of [
        { timezone: "Invalid/Zone" },
        { interval: 0 },
        { interval: 121 },
        { interval: 1.2 },
        { frequency: "HOURLY" },
        { endAfter: 0 },
        { endAfter: 10001 },
        { endsOn: "" },
        { endsOn: "2026-02-30" },
        { endsOn: "2025-12-31" },
        { endsOn: "2026-12-31", endAfter: 5 },
        { occurrenceStatus: "posted" },
        { occurrenceStatus: "POSTED" },
        { endsOn: "9999-12-31" },
        { frequency: "YEARLY", endAfter: 10000 },
    ])
        assert.equal(validRepeat({ ...rule, ...patch }, "2026-01-31"), false)
})
function form(overrides = {}) {
    const f = new FormData()
    for (const [key, value] of Object.entries({
        financialAccountId: "account",
        accountWalletId: "wallet",
        categoryId: "category",
        requestId: "6fde415d-23ec-453e-b24c-65c8cd005bf0",
        type: "EXPENSE",
        name: "Gym",
        amount: "50",
        date: "2026-01-31",
        status: "POSTED",
        repeatEnabled: "on",
        repeatFrequency: "MONTHLY",
        repeatInterval: "1",
        repeatTimezone: "Europe/Athens",
        repeatEnd: "never",
        repeatStatus: "PENDING",
        ...overrides,
    }))
        f.set(key, value)
    return f
}
test("repeat form defaults independent future status and validates all edit confirmation", () => {
    assert.deepEqual(validateTransactionInput(form()).data.repeat, rule)
    for (const editScope of ["ALL", "FUTURE"]) {
        assert.ok(
            validateTransactionInput(
                form({ editScope, expectedRuleVersion: "1" })
            ).errors.editScope
        )
        const result = validateTransactionInput(
            form({
                editScope,
                expectedRuleVersion: "1",
                seriesConfirmed: "yes",
            })
        )
        assert.equal(result.data.editScope, editScope)
    }
    assert.ok(
        validateTransactionInput(form({ repeatEnd: "date", repeatEndsOn: "" }))
            .errors.repeat
    )
    assert.equal(readRepeat(new FormData()), null)
    assert.ok(
        validateTransactionInput(form({ repeatInterval: "0" })).errors.repeat
    )
    assert.ok(
        validateTransactionInput(form({ editScope: "invalid" })).errors
            .editScope
    )
})

test("cadence changes find the next anchored slot without scanning history", () => {
    assert.equal(firstIndexAfter("2026-01-31", rule, "2026-04-30"), 4)
    const settings = { ...rule, frequency: "DAILY" }
    const index = firstIndexAfter("0001-01-01", settings, "2026-11-04")
    assert.equal(scheduleDate("0001-01-01", "DAILY", 1, index), "2026-11-05")
})

test("finite schedules create their full horizon and endless schedules cover a rolling year", () => {
    assert.equal(
        creationHorizon("2026-11-04", { ...rule, endAfter: 6 }, "2026-11-04"),
        "2027-04-04"
    )
    assert.equal(
        creationHorizon(
            "2026-01-31",
            { ...rule, endsOn: "2028-12-31" },
            "2026-11-04"
        ),
        "2028-12-31"
    )
    assert.equal(
        creationHorizon("2026-01-31", rule, "2026-11-04"),
        "2027-11-04"
    )
    assert.equal(
        creationHorizon("2028-01-31", rule, "2026-11-04"),
        "2029-01-31"
    )
    assert.equal(
        validateTransactionInput(form({ repeatStatus: "POSTED" })).data.repeat
            .occurrenceStatus,
        "PENDING"
    )
})
