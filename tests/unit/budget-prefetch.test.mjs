import test from "node:test"
import assert from "node:assert/strict"
import {
    budgetPrefetchRequests,
    budgetDetailRequest,
} from "../../src/lib/budget-prefetch.ts"
import { canonicalWorkspaceRequest } from "../../src/lib/workspace-cache-policy.ts"
const today = "2026-11-11"

test("budget speculation warms only adjacent periods and four visible popup pages", () => {
    const plan = budgetPrefetchRequests(
        "personal",
        ["a", "b", "c", "d", "e"],
        "MONTHLY",
        "2026-11-11",
        "smoothed",
        today
    )
    assert.equal(plan.length, 6)
    assert.deepEqual(
        plan.slice(0, 2).map((r) => r.query.date),
        ["2026-10-01", "2026-12-01"]
    )
    assert.ok(
        plan.every(
            (r) =>
                r.accountId === "personal" &&
                r.query.mode === "smoothed" &&
                r.query.cadence === "MONTHLY"
        )
    )
    assert.deepEqual(
        plan.slice(2).map((r) => r.query.budgetId),
        ["a", "b", "c", "d"]
    )
    assert.ok(
        plan
            .slice(2)
            .every((r) => r.query.date === "2026-11-01" && r.query.page === "0")
    )
    assert.deepEqual(
        plan[2],
        canonicalWorkspaceRequest(
            budgetDetailRequest(
                "personal",
                "a",
                "MONTHLY",
                "2026-11-01",
                "smoothed"
            ),
            today
        )
    )
    assert.notDeepEqual(
        plan,
        budgetPrefetchRequests(
            "home",
            ["a"],
            "MONTHLY",
            "2026-11-11",
            "actual",
            today
        )
    )
})

test("budget neighbors follow daily, weekly and yearly boundaries without exceeding supported dates", () => {
    const dates = (cadence, day) =>
        budgetPrefetchRequests(
            "personal",
            [],
            cadence,
            day,
            "actual",
            today
        ).map((r) => r.query.date)
    assert.deepEqual(dates("DAILY", "2026-01-01"), ["2025-12-31", "2026-01-02"])
    assert.deepEqual(dates("WEEKLY", "2026-11-11"), [
        "2026-11-02",
        "2026-11-16",
    ])
    assert.deepEqual(dates("YEARLY", "2026-11-11"), [
        "2025-01-01",
        "2027-01-01",
    ])
    assert.deepEqual(dates("MONTHLY", "1900-01-01"), ["1900-02-01"])
    assert.deepEqual(dates("MONTHLY", "9998-12-01"), ["9998-11-01"])
})
