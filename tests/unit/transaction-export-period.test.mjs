import test from "node:test"
import assert from "node:assert/strict"
import {
    exportPresetRange,
    exportRangeError,
    exportSearch,
} from "../../src/lib/transaction-export-period.ts"
test("export presets use today independently of the viewed transaction period", () => {
    assert.deepEqual(exportPresetRange("month", "2026-11-09"), {
        from: "2026-11-01",
        to: "2026-11-30",
    })
    assert.deepEqual(exportPresetRange("last-month", "2026-01-09"), {
        from: "2025-12-01",
        to: "2025-12-31",
    })
    assert.deepEqual(exportPresetRange("last-month", "2024-03-09"), {
        from: "2024-02-01",
        to: "2024-02-29",
    })
    assert.deepEqual(exportPresetRange("year", "2026-11-09"), {
        from: "2026-01-01",
        to: "2026-12-31",
    })
})
test("export range validates both inclusive dates and never falls back to another period", () => {
    for (const range of [
        { from: "", to: "" },
        { from: "2026-02-30", to: "2026-03-01" },
        { from: "2026-11-10", to: "2026-11-09" },
        { from: "0001-01-01", to: "2026-01-01" },
        { from: "2026-01-01", to: "9999-01-01" },
    ])
        assert.ok(exportRangeError(range))
    assert.equal(
        exportRangeError({ from: "2024-02-29", to: "2024-02-29" }),
        null
    )
    assert.equal(
        exportRangeError({ from: "0002-01-01", to: "9998-12-31" }),
        null
    )
})
test("export keeps non-date filters but replaces page dates and drops navigation cursors", () => {
    const params = exportSearch(
        {
            q: "Coffee",
            wallet: "bank,cash",
            category: "home",
            type: "EXPENSE",
            status: "POSTED",
            from: "2001-01-01",
            to: "2001-12-31",
            month: "2001-01",
            view: "month",
            before: "old",
        },
        { from: "2020-06-01", to: "2020-06-30" }
    )
    assert.deepEqual(Object.fromEntries(params), {
        from: "2020-06-01",
        to: "2020-06-30",
        q: "Coffee",
        wallet: "bank,cash",
        category: "home",
        type: "EXPENSE",
        status: "POSTED",
    })
})

test("all-time export sends no dates from the page or preview and keeps only non-date filters", () => {
    const search = exportSearch(
        {
            from: "2026-11-01",
            to: "2026-11-30",
            q: "Gym",
            status: "PENDING",
            wallet: "bank",
        },
        "all"
    )
    assert.deepEqual(Object.fromEntries(search), {
        period: "all",
        q: "Gym",
        wallet: "bank",
        status: "PENDING",
    })
})
