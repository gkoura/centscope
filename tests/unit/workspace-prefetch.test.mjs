import test from "node:test"
import assert from "node:assert/strict"
import { setImmediate as tick } from "node:timers/promises"
import { QueryClient, QueryObserver } from "@tanstack/react-query"
import {
    transactionPrefetchRequests,
    workspacePrefetchPlan,
    startWorkspacePrefetch,
} from "../../src/lib/workspace-prefetch.ts"
import {
    workspaceQueryOptions,
    WorkspaceReadError,
} from "../../src/lib/workspace-query-options.ts"

const today = "2026-11-06",
    scope = { userId: "alice", revision: "v1" }
const requests = () => transactionPrefetchRequests("personal", "2026-11", today)
function rig(t) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    })
    // Match browser lifetime semantics without leaving a 24-hour Node GC timer after aborts.
    client.getQueryCache().subscribe((event) => {
        if (event.type === "added")
            event.query.setOptions({ ...event.query.options, gcTime: Infinity })
    })
    const callbacks = new Set(),
        calls = [],
        errors = []
    const original = globalThis.fetch
    globalThis.fetch = (url, init) =>
        new Promise((resolve, reject) => {
            const call = {
                url: new URL(url, "http://localhost"),
                init,
                finish: (
                    data = {
                        month: new URL(
                            url,
                            "http://localhost"
                        ).searchParams.get("month"),
                    },
                    status = 200,
                    identity = scope
                ) =>
                    resolve(
                        Response.json(
                            status === 200 ? { ...identity, data } : {},
                            { status }
                        )
                    ),
            }
            init.signal.addEventListener(
                "abort",
                () => reject(new DOMException("Aborted", "AbortError")),
                { once: true }
            )
            calls.push(call)
        })
    const environment = {
        canRun: () => true,
        scheduleIdle: (callback) => {
            callbacks.add(callback)
            return () => callbacks.delete(callback)
        },
        onError: (error) => errors.push(error),
    }
    const start = () =>
        startWorkspacePrefetch(client, scope, requests(), today, environment)
    const idle = async () => {
        const callback = callbacks.values().next().value
        if (callback) {
            callbacks.delete(callback)
            callback()
        }
        await tick()
    }
    t.after(() => {
        client.clear()
        globalThis.fetch = original
    })
    return { client, calls, errors, environment, start, idle, callbacks }
}

test("prefetch plans exactly the selected month, two previous months and next month, including year boundaries", () => {
    const plan = transactionPrefetchRequests("personal", "2026-01", today)
    assert.deepEqual(
        plan.map((r) => r.query.month),
        ["2026-01", "2025-12", "2025-11", "2026-02"]
    )
    assert.ok(
        plan.every(
            (r) =>
                r.accountId === "personal" &&
                r.resource === "transactions" &&
                Object.keys(r.query).join() === "month,view"
        )
    )
    assert.deepEqual(
        transactionPrefetchRequests("personal", "0002-01", today).map(
            (r) => r.query.month
        ),
        ["0002-01", "0002-02"]
    )
    assert.deepEqual(
        transactionPrefetchRequests("personal", "9998-12", today).map(
            (r) => r.query.month
        ),
        ["9998-12", "9998-11", "9998-10"]
    )
    assert.deepEqual(
        transactionPrefetchRequests("personal", "invalid", today),
        []
    )
    assert.deepEqual(
        transactionPrefetchRequests("personal", "0001-12", today),
        []
    )
})

test("background work waits for foreground data, uses one request at a time and yields when new foreground work starts", async (t) => {
    const r = rig(t)
    let release
    const foreground = r.client.query({
        queryKey: ["visible"],
        queryFn: () =>
            new Promise((resolve) => {
                release = resolve
            }),
    })
    const queue = r.start()
    t.after(queue.stop)
    await r.idle()
    assert.equal(r.calls.length, 0)
    release("ready")
    await foreground
    await r.idle()
    assert.equal(r.calls.length, 1)
    assert.equal(r.calls[0].url.searchParams.get("month"), "2026-11")
    assert.equal(r.calls[0].init.priority, "low")
    assert.equal(r.calls[0].init.cache, "no-store")
    assert.equal(r.calls[0].init.headers["X-Fintrack-User"], "alice")
    await r.idle()
    assert.equal(r.calls.length, 1)
    let releaseNext
    const nextForeground = r.client.query({
        queryKey: ["another visible screen"],
        queryFn: () =>
            new Promise((resolve) => {
                releaseNext = resolve
            }),
    })
    r.calls[0].finish()
    await tick()
    await r.idle()
    assert.equal(r.calls.length, 1)
    releaseNext("ready")
    await nextForeground
    await r.idle()
    assert.equal(r.calls.length, 2)
    assert.equal(r.calls[1].url.searchParams.get("month"), "2026-10")
    r.calls[1].finish()
    await tick()
    await r.idle()
    r.calls[2].finish()
    await tick()
    await r.idle()
    r.calls[3].finish()
    await tick()
    await r.idle()
    assert.equal(r.calls.length, 4)
    assert.equal(r.callbacks.size, 0)
})

test("fresh prefetched data is reused on demand, while stale or invalidated data refetches", async (t) => {
    const r = rig(t)
    const options = workspaceQueryOptions(
        scope,
        {
            resource: "transactions",
            accountId: "personal",
            query: { month: "2026-11" },
        },
        today
    )
    assert.deepEqual(
        options.queryKey,
        workspaceQueryOptions(scope, requests()[0], today, "low").queryKey
    )
    const queue = r.start()
    t.after(queue.stop)
    await r.idle()
    r.calls[0].finish()
    await tick()
    queue.stop()
    const observer = new QueryObserver(r.client, options)
    let unsubscribe = observer.subscribe(() => {})
    await tick()
    assert.equal(r.calls.length, 1)
    assert.deepEqual(observer.getCurrentResult().data, { month: "2026-11" })
    unsubscribe()
    r.client.setQueryData(
        options.queryKey,
        { month: "2026-11" },
        { updatedAt: Date.now() - options.staleTime - 1 }
    )
    unsubscribe = new QueryObserver(r.client, options).subscribe(() => {})
    await tick()
    assert.equal(r.calls.length, 2)
    r.calls[1].finish()
    await tick()
    unsubscribe()
    await r.client.invalidateQueries({
        queryKey: options.queryKey,
        exact: true,
        refetchType: "none",
    })
    unsubscribe = new QueryObserver(r.client, options).subscribe(() => {})
    await tick()
    assert.equal(r.calls.length, 3)
    r.calls[2].finish()
    await tick()
    unsubscribe()
})

test("offline/hidden/readiness gates pause speculation and resume without widening the window", async (t) => {
    const r = rig(t)
    r.environment.canRun = () => false
    const queue = r.start()
    t.after(queue.stop)
    await r.idle()
    assert.equal(r.calls.length, 0)
    r.environment.canRun = () => true
    queue.resume()
    await r.idle()
    assert.equal(r.calls.length, 1)
    queue.stop()
    assert.equal(r.calls[0].init.signal.aborted, true)
    await tick()
    await r.idle()
    assert.equal(r.calls.length, 1)
    assert.equal(
        r.client.getQueryData(
            workspaceQueryOptions(scope, requests()[0], today).queryKey
        ),
        undefined
    )
})

test("navigation inherits an in-flight prefetch without an extra fetch or cancellation", async (t) => {
    const r = rig(t),
        queue = r.start()
    t.after(queue.stop)
    await r.idle()
    const options = workspaceQueryOptions(scope, requests()[0], today)
    const observer = new QueryObserver(r.client, options)
    const unsubscribe = observer.subscribe(() => {})
    t.after(unsubscribe)
    await tick()
    assert.equal(r.calls.length, 1)
    queue.stop()
    assert.equal(r.calls[0].init.signal.aborted, false)
    r.calls[0].finish()
    await tick()
    assert.deepEqual(observer.getCurrentResult().data, { month: "2026-11" })
    assert.equal(r.calls.length, 1)
    assert.equal(
        r.client.getQueryData(
            workspaceQueryOptions(
                { userId: "bob", revision: "v1" },
                requests()[0],
                today
            ).queryKey
        ),
        undefined
    )
    assert.equal(
        r.client.getQueryData(
            workspaceQueryOptions(
                { userId: "alice", revision: "v2" },
                requests()[0],
                today
            ).queryKey
        ),
        undefined
    )
})

test("navigation cleanup before the destination mounts preserves its in-flight request and stops neighboring work", async (t) => {
    const r = rig(t),
        queue = r.start()
    await r.idle()
    queue.stop({ cancelInactive: false })
    assert.equal(r.calls[0].init.signal.aborted, false)
    const observer = new QueryObserver(
        r.client,
        workspaceQueryOptions(scope, requests()[0], today)
    )
    const unsubscribe = observer.subscribe(() => {})
    t.after(unsubscribe)
    await tick()
    assert.equal(r.calls.length, 1)
    r.calls[0].finish()
    await tick()
    await r.idle()
    assert.deepEqual(observer.getCurrentResult().data, { month: "2026-11" })
    assert.equal(r.calls.length, 1)
    assert.equal(r.callbacks.size, 0)
})

test("ordinary speculative failures are silent and do not prevent the next month from loading", async (t) => {
    const r = rig(t),
        queue = r.start()
    t.after(queue.stop)
    await r.idle()
    r.calls[0].finish(undefined, 503)
    await tick()
    await r.idle()
    assert.equal(r.calls.length, 2)
    assert.equal(r.errors.length, 1)
    assert.equal(r.errors[0].status, 503)
})

for (const status of [401, 403, 404, 409])
    test(`access/revision failure ${status} stops the speculative queue`, async (t) => {
        const r = rig(t),
            queue = r.start()
        t.after(queue.stop)
        await r.idle()
        r.calls[0].finish(undefined, status)
        await tick()
        await r.idle()
        assert.equal(r.calls.length, 1)
        assert.ok(r.errors[0] instanceof WorkspaceReadError)
        assert.equal(r.errors[0].status, status)
    })

test("a response for a different identity is rejected and cannot enter the cache", async (t) => {
    const r = rig(t),
        queue = r.start()
    t.after(queue.stop)
    await r.idle()
    r.calls[0].finish({ private: "other user's data" }, 200, {
        userId: "bob",
        revision: "v1",
    })
    await tick()
    await r.idle()
    assert.equal(r.calls.length, 1)
    assert.equal(r.errors[0].status, 409)
    assert.equal(
        r.client.getQueryData(
            workspaceQueryOptions(scope, requests()[0], today).queryKey
        ),
        undefined
    )
})

test("only active account overview/month views speculate, and repeated filters match the foreground key", () => {
    const base = "/dashboard/accounts/personal"
    for (const path of [
        base + "/categories",
        base + "/transactions/new",
        "/settings/security",
        "/dashboard/accounts/other",
    ])
        assert.equal(workspacePrefetchPlan("personal", path, "", today), null)
    for (const query of [
        "view=year&year=2026",
        "view=custom&from=2026-01-01&to=2026-02-01",
    ])
        assert.equal(
            workspacePrefetchPlan(
                "personal",
                base + "/transactions",
                query,
                today
            ),
            null
        )
    const plan = workspacePrefetchPlan(
        "personal",
        base + "/transactions",
        "month=2026-10&wallet=a&wallet=b&q=coffee",
        today
    )
    assert.deepEqual(
        workspaceQueryOptions(scope, plan.foreground, today).queryKey,
        workspaceQueryOptions(
            scope,
            {
                resource: "transactions",
                accountId: "personal",
                query: { month: "2026-10", wallet: ["a", "b"], q: "coffee" },
            },
            today
        ).queryKey
    )
    assert.equal(plan.requests[0].query.month, "2026-10")
    assert.ok(
        plan.requests.every(
            (request) => !request.query.wallet && !request.query.q
        )
    )
    const overview = workspacePrefetchPlan(
        "personal",
        base,
        "month=2026-10&status=PENDING",
        today
    )
    assert.deepEqual(overview.foreground, {
        resource: "reference",
        accountId: "personal",
    })
})

test("Analytics shares unfiltered month summaries and warms only its default rolling trends", () => {
    const base = "/dashboard/accounts/personal"
    const plan = workspacePrefetchPlan(
        "personal",
        base + "/analytics",
        "month=2026-10&wallet=a&status=PENDING&q=coffee",
        today
    )
    assert.deepEqual(plan.foreground, {
        resource: "activity",
        accountId: "personal",
        query: { month: "2026-10" },
    })
    assert.deepEqual(
        plan.requests
            .filter((r) => r.resource === "transactions")
            .map((r) => r.query.month),
        ["2026-10", "2026-09", "2026-08", "2026-11"]
    )
    assert.deepEqual(plan.requests.at(-1), {
        resource: "monthlyTrends",
        accountId: "personal",
        query: { month: "2026-10" },
    })
    const annual = workspacePrefetchPlan(
        "personal",
        base + "/analytics",
        "view=year&year=2025",
        today
    )
    assert.equal(annual.foreground.query.year, "2025")
    assert.deepEqual(
        annual.requests.map((r) => r.resource),
        ["monthlyTrends"]
    )
    const overview = workspacePrefetchPlan(
        "personal",
        base,
        "month=2025-01",
        today
    )
    assert.equal(overview.foreground.resource, "reference")
    assert.equal(overview.requests.at(-1).query.month, "2026-10")
})

test("a transaction response supplies Analytics without another request, with cursor and filter isolation", async (t) => {
    const r = rig(t)
    const query = {
        view: "year",
        year: "2026",
        before: "cursor",
        wallet: "a",
        status: "POSTED",
    }
    const transaction = workspaceQueryOptions(
        scope,
        { resource: "transactions", accountId: "personal", query },
        today
    )
    const activity = workspaceQueryOptions(
        scope,
        { resource: "activity", accountId: "personal", query },
        today
    )
    const summary = {
        count: 2,
        categories: [],
        incomeCategories: [
            { name: "Salary", currency: "EUR", amount: "50.00" },
        ],
    }
    const response = r.client.query(transaction)
    r.calls[0].finish({ history: { transactions: [] }, activity: summary })
    await response
    const observer = new QueryObserver(r.client, activity)
    const unsubscribe = observer.subscribe(() => {})
    t.after(unsubscribe)
    await tick()
    assert.equal(r.calls.length, 1)
    assert.deepEqual(observer.getCurrentResult().data, summary)
    for (const input of [
        {
            resource: "activity",
            accountId: "personal",
            query: { ...query, wallet: "b" },
        },
        {
            resource: "activity",
            accountId: "personal",
            query: { view: "year", year: "2026" },
        },
        { resource: "activity", accountId: "home", query },
    ])
        assert.equal(
            r.client.getQueryData(
                workspaceQueryOptions(scope, input, today).queryKey
            ),
            undefined
        )
    assert.equal(
        r.client.getQueryData(
            workspaceQueryOptions(
                { userId: "bob", revision: "v1" },
                { resource: "activity", accountId: "personal", query },
                today
            ).queryKey
        ),
        undefined
    )
})

test("a delayed transaction response does not overwrite a newer Analytics summary", async (t) => {
    const r = rig(t)
    const activity = workspaceQueryOptions(
        scope,
        {
            resource: "activity",
            accountId: "personal",
            query: { month: "2026-11" },
        },
        today
    )
    const response = r.client.query(
        workspaceQueryOptions(scope, requests()[0], today)
    )
    r.client.setQueryData(
        activity.queryKey,
        { count: 3 },
        { updatedAt: Date.now() + 1 }
    )
    r.calls[0].finish({ activity: { count: 2 } })
    await response
    assert.deepEqual(r.client.getQueryData(activity.queryKey), { count: 3 })
})

test("a cancelled transaction read cannot seed Analytics after account or scope teardown", async (t) => {
    const r = rig(t)
    const options = workspaceQueryOptions(scope, requests()[0], today)
    const controller = new AbortController()
    const response = options.queryFn({
        signal: controller.signal,
        client: r.client,
        queryKey: options.queryKey,
    })
    // The transport may already have resolved its response when cleanup happens.
    r.calls[0].finish({ activity: { count: 2 } })
    controller.abort()
    await assert.rejects(response, { name: "AbortError" })
    assert.equal(
        r.client.getQueryData(
            workspaceQueryOptions(
                scope,
                { ...requests()[0], resource: "activity" },
                today
            ).queryKey
        ),
        undefined
    )
})

test("All time keeps the analytics foreground key and does not speculate unrelated transaction months", () => {
    const base = "/dashboard/accounts/account"
    const analytics = workspacePrefetchPlan(
        "account",
        base + "/analytics",
        "view=all&month=2000-01",
        today
    )
    assert.deepEqual(analytics.foreground.query, { view: "all" })
    assert.deepEqual(
        analytics.requests.map((r) => r.resource),
        ["monthlyTrends"]
    )
    assert.equal(
        workspacePrefetchPlan(
            "account",
            base + "/transactions",
            "view=all",
            today
        ),
        null
    )
    assert.equal(
        workspacePrefetchPlan("account", base, "view=all", today),
        null
    )
})
