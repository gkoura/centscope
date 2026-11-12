import test from "node:test"
import assert from "node:assert/strict"
import {
    paymentDue,
    summarizePendingPayments,
    pendingPaymentsHref,
} from "../../src/lib/pending-payments.ts"
import { canonicalWorkspaceRequest } from "../../src/lib/workspace-cache-policy.ts"
const payment = (values = {}) => ({
    id: "entry",
    transactionId: "transaction",
    name: "Rent",
    date: "2026-11-07",
    amount: "10.15",
    currency: "EUR",
    walletName: "Bank",
    recurring: false,
    ...values,
})

test("due labels distinguish today, overdue and upcoming across calendar boundaries", () => {
    assert.deepEqual(paymentDue("2026-11-07", "2026-11-07"), {
        state: "today",
        label: "Due today",
    })
    assert.deepEqual(paymentDue("2026-11-06", "2026-11-07"), {
        state: "overdue",
        label: "1 day overdue",
    })
    assert.deepEqual(paymentDue("2026-11-01", "2026-11-07"), {
        state: "overdue",
        label: "6 days overdue",
    })
    assert.equal(paymentDue("2026-11-08", "2026-11-07").label, "Due tomorrow")
    assert.equal(paymentDue("2026-11-10", "2026-11-07").label, "Due in 3 days")
    assert.equal(paymentDue("2026-12-31", "2027-01-01").label, "1 day overdue")
    assert.equal(paymentDue("2024-02-29", "2024-03-01").label, "1 day overdue")
    assert.equal(paymentDue("2026-10-25", "2026-10-26").label, "1 day overdue")
})
test("summary puts earliest unpaid items first and includes only overdue payments in counts and exact per-currency totals", () => {
    const payments = Array.from({ length: 8 }, (_, i) =>
        payment({
            id: String(i),
            date: `2026-11-${String(i + 4).padStart(2, "0")}`,
            amount: i === 7 ? "9999999999999999.99" : "0.01",
        })
    )
    payments.push(
        payment({
            id: "usd",
            date: "2026-12-01",
            amount: "2.00",
            currency: "USD",
        })
    )
    const summary = summarizePendingPayments(
        [...payments].reverse(),
        "2026-11-07"
    )
    assert.equal(summary.count, 3)
    assert.equal(summary.overdue, 3)
    assert.equal(summary.dueToday, 0)
    assert.equal(summary.items.length, 3)
    assert.equal(summary.items[0].date, "2026-11-04")
    assert.equal(summary.items[0].due.state, "overdue")
    assert.deepEqual(summary.totals, [{ currency: "EUR", amount: "0.03" }])
    assert.equal(summary.from, "2026-11-04")
    assert.equal(summary.to, "2026-11-06")
    assert.equal(payments[0].id, "0")
})
test("view-all link excludes future payments and includes older overdue payments", () => {
    const summary = summarizePendingPayments(
        [
            payment({ date: "2025-01-01" }),
            payment({ id: "future", date: "2027-12-31" }),
        ],
        "2026-11-07"
    )
    const url = new URL(
        pendingPaymentsHref("account", summary),
        "https://example.test"
    )
    assert.equal(url.pathname, "/dashboard/accounts/account/transactions")
    assert.deepEqual(Object.fromEntries(url.searchParams), {
        status: "PENDING",
        type: "EXPENSE",
        view: "custom",
        from: "2025-01-01",
        to: "2025-01-01",
    })
    assert.equal(summarizePendingPayments([], "2026-11-07").count, 0)
    assert.deepEqual(summarizePendingPayments([], "2026-11-07").totals, [])
})
test("pending summary caches roll over daily and ignore overview month/list filters", () => {
    const request = (today) =>
        canonicalWorkspaceRequest(
            {
                resource: "pendingPayments",
                accountId: "account",
                query: { month: "2025-01", status: "POSTED", wallet: "other" },
            },
            today
        )
    assert.deepEqual(request("2026-11-07").query, { day: "2026-11-07" })
    assert.notDeepEqual(request("2026-11-07"), request("2026-11-08"))
})

test("today and future pending payments produce no warning summary", () => {
    const summary = summarizePendingPayments(
        [
            payment({ date: "2026-11-07" }),
            payment({ id: "future", date: "2026-11-08" }),
        ],
        "2026-11-07"
    )
    assert.equal(summary.count, 0)
    assert.deepEqual(summary.items, [])
    assert.deepEqual(summary.totals, [])
})
