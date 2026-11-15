import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"

const source = readFileSync(
    new URL("../../public/sw.js", import.meta.url),
    "utf8"
)

function worker({ offline = false } = {}) {
    const handlers = {}
    const stored = new Map()
    const deleted = []
    const network = []
    let skipped = false
    const cache = {
        addAll: async (urls) =>
            urls.forEach((url) => stored.set(url, new Response(url))),
        match: async (url) =>
            stored.get(typeof url === "string" ? url : url.url)?.clone(),
    }
    vm.runInNewContext(source, {
        URL,
        Response,
        self: {
            location: { origin: "https://centscope.test" },
            addEventListener: (type, handler) => {
                handlers[type] = handler
            },
            clients: { claim: async () => {} },
            skipWaiting: () => {
                skipped = true
            },
        },
        caches: {
            open: async () => cache,
            keys: async () => [
                "centscope-public-v0",
                "centscope-public-v1",
                "unrelated-cache",
            ],
            delete: async (key) => {
                deleted.push(key)
            },
        },
        fetch: async (request) => {
            network.push(request)
            if (offline) throw new TypeError("Failed to fetch")
            return new Response("private response")
        },
    })
    async function lifecycle(type) {
        let pending
        handlers[type]({
            waitUntil: (promise) => {
                pending = promise
            },
        })
        await pending
    }
    function fetchEvent(
        path,
        { method = "GET", mode = "navigate", headers = {} } = {}
    ) {
        let response
        handlers.fetch({
            request: {
                url: new URL(path, "https://centscope.test").href,
                method,
                mode,
                headers: new Headers(headers),
            },
            respondWith: (promise) => {
                response = promise
            },
        })
        return response
    }
    return {
        lifecycle,
        fetchEvent,
        stored,
        deleted,
        network,
        handlers,
        skipped: () => skipped,
    }
}

test("install precaches only public offline assets and does not force activation", async () => {
    const sw = worker()
    await sw.lifecycle("install")
    assert.equal(sw.stored.size, 5)
    assert.ok(sw.stored.has("/offline.html"))
    assert.ok(
        [...sw.stored.keys()].every(
            (key) => key === "/offline.html" || key.startsWith("/icons/")
        )
    )
    assert.equal(sw.skipped(), false)
    sw.handlers.message({ data: { type: "unrelated" } })
    assert.equal(sw.skipped(), false)
    sw.handlers.message({ data: { type: "SKIP_WAITING" } })
    assert.equal(sw.skipped(), true)
})

test("activation removes only older CentScope public caches", async () => {
    const sw = worker()
    await sw.lifecycle("activate")
    assert.deepEqual(sw.deleted, ["centscope-public-v0"])
})

test("online private navigations go to network and are never persisted", async () => {
    const sw = worker()
    await sw.lifecycle("install")
    const response = await sw.fetchEvent("/dashboard/accounts/private")
    assert.equal(await response.text(), "private response")
    assert.equal(sw.stored.size, 5)
    assert.equal(sw.network.length, 1)
})

test("offline cold navigation returns the public fallback while retaining its URL", async () => {
    const sw = worker({ offline: true })
    await sw.lifecycle("install")
    const response = await sw.fetchEvent(
        "/dashboard/accounts/private?filter=expense"
    )
    assert.equal(await response.text(), "/offline.html")
    const icon = await sw.fetchEvent("/icons/icon-192.png", { mode: "no-cors" })
    assert.equal(await icon.text(), "/icons/icon-192.png")
})

test("auth, APIs, RSC, exports, external URLs and writes are never intercepted", () => {
    const sw = worker()
    for (const [path, options] of [
        ["/api/auth/get-session"],
        ["/api/workspace?resource=accounts"],
        ["/dashboard/accounts/private/transactions/export"],
        ["/dashboard/sharing/private/export"],
        ["/dashboard?_rsc=123", { mode: "cors" }],
        ["/dashboard", { mode: "cors", headers: { RSC: "1" } }],
        ["/dashboard", { method: "POST" }],
        ["https://external.test/page"],
        ["/_next/static/chunk.js", { mode: "cors" }],
    ])
        assert.equal(sw.fetchEvent(path, options), undefined, path)
    assert.equal(sw.network.length, 0)
})
