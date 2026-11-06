import test from "node:test"
import assert from "node:assert/strict"
import { recurringSummaryDescription } from "../../src/lib/recurring-summary.ts"
import {
    canonicalWorkspaceRequest,
    workspaceResources,
} from "../../src/lib/workspace-cache-policy.ts"

const rule = {
    frequency: "MONTHLY",
    interval: 1,
    startsOn: "2026-01-31",
    endsOn: null,
    endAfter: null,
    paused: false,
}
test("shows concise open-ended cadence and interval descriptions", () => {
    for (const [frequency, expected] of [
        ["DAILY", "Daily"],
        ["WEEKLY", "Weekly"],
        ["MONTHLY", "Monthly"],
        ["YEARLY", "Yearly"],
    ]) {
        assert.equal(
            recurringSummaryDescription({ ...rule, frequency }),
            expected
        )
    }
    assert.equal(
        recurringSummaryDescription({ ...rule, interval: 2 }),
        "Every 2 months"
    )
    assert.equal(
        recurringSummaryDescription({
            ...rule,
            frequency: "WEEKLY",
            interval: 3,
        }),
        "Every 3 weeks"
    )
})
test("uses day/month/year end dates and marks paused schedules", () => {
    assert.equal(
        recurringSummaryDescription({ ...rule, endsOn: "2026-12-31" }),
        "Monthly until 31/12/2026"
    )
    assert.equal(
        recurringSummaryDescription({ ...rule, paused: true }),
        "Monthly · Paused"
    )
    assert.equal(
        recurringSummaryDescription({
            ...rule,
            endsOn: "2027-01-01",
            paused: true,
        }),
        "Monthly until 01/01/2027 · Paused"
    )
})
test("count-limited schedules use the recurrence engine's exact last date", () => {
    assert.equal(
        recurringSummaryDescription({ ...rule, endAfter: 2 }),
        "Monthly until 28/02/2026"
    )
    assert.equal(
        recurringSummaryDescription({
            ...rule,
            startsOn: "2024-01-31",
            endAfter: 2,
        }),
        "Monthly until 29/02/2024"
    )
    assert.equal(
        recurringSummaryDescription({
            ...rule,
            startsOn: "2026-01-15",
            interval: 2,
            endAfter: 3,
        }),
        "Every 2 months until 15/05/2026"
    )
})
test("recurring summaries use an account-scoped cache resource independent of the viewed month", () => {
    assert.ok(workspaceResources.includes("recurring"))
    const request = canonicalWorkspaceRequest(
        {
            resource: "recurring",
            accountId: "personal",
            query: { month: "2025-01", wallet: "bank" },
        },
        "2026-11-06"
    )
    assert.deepEqual(request, {
        resource: "recurring",
        accountId: "personal",
        query: {},
    })
})
