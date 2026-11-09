import test from "node:test"
import assert from "node:assert/strict"
import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query"
import {
    canonicalWorkspaceRequest,
    workspaceQueryKey,
    WORKSPACE_CACHE_VERSION,
    WORKSPACE_CACHE_MAX_AGE,
    WORKSPACE_CACHE_MAX_BYTES,
    WORKSPACE_CACHE_MAX_QUERIES,
    isOwnedWorkspaceQuery,
} from "../../src/lib/workspace-cache-policy.ts"
import {
    persistedWorkspaceState,
    restoredWorkspaceState,
} from "../../src/lib/workspace-cache-state.ts"
const today = "2026-11-05"
const request = (query = {}) =>
    canonicalWorkspaceRequest(
        { resource: "transactions", accountId: "account-a", query },
        today
    )
const key = (user = "alice", revision = "v1", query = {}) =>
    workspaceQueryKey(user, revision, request(query))
const client = () =>
    new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })

test("month caches share equivalent URLs but separate accounts, users, revisions, periods and filters", () => {
    assert.deepEqual(
        request({
            month: "2026-11",
            before: "ignored",
            returnTo: "/ignored",
            wallet: "b,a,a",
        }),
        request({ wallet: ["a", "b"], view: "month" })
    )
    assert.notDeepEqual(key(), key("bob"))
    assert.notDeepEqual(key(), key("alice", "v2"))
    assert.notDeepEqual(key(), key("alice", "v1", { month: "2026-10" }))
    assert.notDeepEqual(key(), key("alice", "v1", { status: "PENDING" }))
    assert.notDeepEqual(
        request(),
        canonicalWorkspaceRequest(
            { ...request(), accountId: "account-b" },
            today
        )
    )
    assert.notDeepEqual(
        request({ view: "year", before: "one" }),
        request({ view: "year", before: "two" })
    )
    assert.notDeepEqual(
        request(),
        canonicalWorkspaceRequest(
            { resource: "transactions", accountId: "account-a" },
            "2026-12-01"
        )
    )
})

test("only financial values for the verified user and revision can be persisted or restored", () => {
    const source = client()
    source.setQueryData(
        key(),
        { name: "Alice private transaction" },
        { updatedAt: 10 }
    )
    source.setQueryData(key("bob"), { name: "Bob private transaction" })
    source.setQueryData(key("alice", "old"), { name: "Outdated balance" })
    source.setQueryData(["auth", "session"], { token: "must-never-be-stored" })
    const state = persistedWorkspaceState(dehydrate(source), "alice", "v1")
    assert.equal(state.queries.length, 1)
    assert.equal(JSON.stringify(state).includes("must-never-be-stored"), false)
    const saved = {
        version: WORKSPACE_CACHE_VERSION,
        userId: "alice",
        revision: "v1",
        savedAt: 10,
        state,
    }
    for (const [user, revision, now] of [
        ["bob", "v1", 11],
        ["alice", "v2", 11],
        ["alice", "v1", 10 + WORKSPACE_CACHE_MAX_AGE],
        ["alice", "v1", 9],
    ])
        assert.equal(
            restoredWorkspaceState(saved, user, revision, now),
            undefined
        )
    assert.equal(
        restoredWorkspaceState({ ...saved, version: 0 }, "alice", "v1", 11),
        undefined
    )
    const target = client()
    hydrate(target, restoredWorkspaceState(saved, "alice", "v1", 11))
    assert.deepEqual(target.getQueryData(key()), {
        name: "Alice private transaction",
    })
    assert.equal(target.getQueryData(key("bob")), undefined)
    source.clear()
    target.clear()
})

test("restoring a disk snapshot never overwrites a newer in-memory response", () => {
    const source = client(),
        target = client()
    source.setQueryData(key(), { amount: "10.00" }, { updatedAt: 10 })
    target.setQueryData(key(), { amount: "20.00" }, { updatedAt: 20 })
    hydrate(target, persistedWorkspaceState(dehydrate(source), "alice", "v1"))
    assert.deepEqual(target.getQueryData(key()), { amount: "20.00" })
    source.clear()
    target.clear()
})

test("snapshot budgets prefer recent reads and skip oversized datasets", () => {
    const source = client()
    for (let i = 0; i < WORKSPACE_CACHE_MAX_QUERIES + 5; i++)
        source.setQueryData(key("alice", "v1", { q: String(i) }), i, {
            updatedAt: i + 1,
        })
    source.setQueryData(key(), "x".repeat(WORKSPACE_CACHE_MAX_BYTES), {
        updatedAt: 1000,
    })
    const state = persistedWorkspaceState(dehydrate(source), "alice", "v1")
    assert.equal(state.queries.length, WORKSPACE_CACHE_MAX_QUERIES)
    assert.ok(
        new TextEncoder().encode(JSON.stringify(state)).byteLength <
            WORKSPACE_CACHE_MAX_BYTES
    )
    assert.equal(state.queries[0].state.data, WORKSPACE_CACHE_MAX_QUERIES + 4)
    assert.equal(
        state.queries.some((query) => query.state.data === 0),
        false
    )
    source.clear()
})

test("a failed background refresh retains its last successful value without persisting errors", async () => {
    const source = client()
    source.setQueryData(key(), { balance: "42.00" })
    await assert.rejects(
        source.fetchQuery({
            queryKey: key(),
            staleTime: 0,
            retry: false,
            queryFn: () => {
                throw new Error("private error detail")
            },
        })
    )
    const state = persistedWorkspaceState(
        dehydrate(source, {
            shouldDehydrateQuery: (query) => query.state.data !== undefined,
        }),
        "alice",
        "v1"
    )
    assert.equal(state.queries[0].state.status, "success")
    assert.deepEqual(state.queries[0].state.data, { balance: "42.00" })
    assert.equal(JSON.stringify(state).includes("private error detail"), false)
    source.clear()
})

test("response schema upgrades reject v1 snapshots even with an unchanged financial revision", () => {
    const source = client()
    source.setQueryData(key(), { activity: { categories: [] } })
    const state = dehydrate(source)
    const saved = {
        version: 1,
        userId: "alice",
        revision: "v1",
        savedAt: 10,
        state,
    }
    assert.equal(restoredWorkspaceState(saved, "alice", "v1", 11), undefined)
    const oldKey = [...key()]
    oldKey[1] = 1
    const incompatible = {
        ...state,
        queries: state.queries.map((q) => ({ ...q, queryKey: oldKey })),
    }
    assert.equal(
        persistedWorkspaceState(incompatible, "alice", "v1").queries.length,
        0
    )
    assert.equal(
        restoredWorkspaceState(
            { ...saved, version: WORKSPACE_CACHE_VERSION, state: incompatible },
            "alice",
            "v1",
            11
        ).queries.length,
        0
    )
    source.clear()
})

test("access/revision rejection cannot turn saved data back into success on reload", async () => {
    for (const status of [401, 403, 404, 409]) {
        const source = client()
        source.setQueryData(key(), { private: "previously allowed data" })
        await assert.rejects(
            source.query({
                queryKey: key(),
                staleTime: 0,
                retry: false,
                queryFn: () => {
                    throw Object.assign(new Error("Access rejected"), {
                        status,
                    })
                },
            })
        )
        const state = dehydrate(source, { shouldDehydrateQuery: () => true })
        assert.equal(
            persistedWorkspaceState(state, "alice", "v1").queries.length,
            0
        )
        source.clear()
    }
})

test("all-time workspace keys drop stale dates but retain transaction filters and pagination", () => {
    const all = request({
        view: "all",
        from: "2000-01-01",
        to: "2000-02-01",
        month: "2000-01",
        wallet: "b,a",
        before: "cursor",
    })
    assert.deepEqual(all.query, {
        before: "cursor",
        view: "all",
        wallet: "a,b",
    })
    assert.notDeepEqual(
        all,
        request({ view: "year", year: "2000", wallet: "a,b", before: "cursor" })
    )
    assert.deepEqual(
        canonicalWorkspaceRequest(
            {
                resource: "monthlyTrends",
                accountId: "a",
                query: { view: "all", month: "2000-01" },
            },
            today
        ),
        { resource: "monthlyTrends", accountId: "a", query: { view: "all" } }
    )
})

test("saving recent activity cannot extend the lifetime of an old financial response", () => {
    const source = client(),
        now = 3 * WORKSPACE_CACHE_MAX_AGE
    source.setQueryData(
        key(),
        { balance: "stale" },
        { updatedAt: now - WORKSPACE_CACHE_MAX_AGE }
    )
    source.setQueryData(
        key("alice", "v1", { month: "2026-10" }),
        { balance: "recent" },
        { updatedAt: now - 1 }
    )
    source.setQueryData(
        key("alice", "v1", { month: "2026-09" }),
        { balance: "future" },
        { updatedAt: now + 1 }
    )
    const state = persistedWorkspaceState(dehydrate(source), "alice", "v1")
    const saved = {
        version: WORKSPACE_CACHE_VERSION,
        userId: "alice",
        revision: "v1",
        savedAt: now,
        state,
    }
    const restored = restoredWorkspaceState(saved, "alice", "v1", now)
    assert.deepEqual(
        restored.queries.map((q) => q.state.data),
        [{ balance: "recent" }]
    )
    source.clear()
})

test("owned persistence eviction preserves fresh shared queries in memory without saving them to disk", async () => {
    const source = client(),
        ownedIds = new Set(["owned"])
    const ownedKey = workspaceQueryKey("alice", "v1", {
        resource: "reference",
        accountId: "owned",
    })
    const sharedKey = workspaceQueryKey("alice", "v1", {
        resource: "transactions",
        accountId: "shared",
    })
    source.setQueryData(ownedKey, { balance: "owned" })
    source.setQueryData(sharedKey, { balance: "shared" })
    const eligible = (q) =>
        isOwnedWorkspaceQuery(q.queryKey, "alice", "v1", ownedIds)
    const state = persistedWorkspaceState(
        dehydrate(source, { shouldDehydrateQuery: eligible }),
        "alice",
        "v1"
    )
    assert.deepEqual(
        state.queries.map((q) => q.state.data),
        [{ balance: "owned" }]
    )
    // Simulate an owned response excluded by the disk budget while shared reads stay memory-only.
    source.removeQueries({
        predicate: (q) => eligible(q) && q.getObserversCount() === 0,
    })
    assert.equal(source.getQueryData(ownedKey), undefined)
    let reads = 0
    const shared = await source.query({
        queryKey: sharedKey,
        staleTime: 30_000,
        queryFn: () => {
            reads++
            return {}
        },
    })
    assert.deepEqual(shared, { balance: "shared" })
    assert.equal(reads, 0)
    assert.equal(
        isOwnedWorkspaceQuery(sharedKey, "bob", "v1", new Set(["shared"])),
        false
    )
    assert.equal(
        isOwnedWorkspaceQuery(sharedKey, "alice", "old", new Set(["shared"])),
        false
    )
    source.clear()
})

test("pending-payment caches roll over at UTC midnight while lifetime trends keep their independent key", () => {
    const pending = (day) =>
        canonicalWorkspaceRequest(
            {
                resource: "pendingPayments",
                accountId: "account-a",
                query: { day: "stale-url-day" },
            },
            day
        )
    assert.notDeepEqual(pending("2026-11-10"), pending("2026-11-11"))
    assert.deepEqual(pending("2026-11-10").query, { day: "2026-11-10" })
    const all = canonicalWorkspaceRequest(
        {
            resource: "monthlyTrends",
            accountId: "account-a",
            query: { view: "all", month: "2020-01", status: "PENDING" },
        },
        today
    )
    assert.deepEqual(all.query, { view: "all" })
    assert.notDeepEqual(
        all,
        canonicalWorkspaceRequest(
            {
                resource: "monthlyTrends",
                accountId: "account-a",
                query: { month: "2020-01" },
            },
            today
        )
    )
})
