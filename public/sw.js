// Bump this version whenever the offline document or its assets change.
const CACHE_NAME = "centscope-public-v1"
const OFFLINE_URL = "/offline.html"
const PUBLIC_ASSETS = [
    OFFLINE_URL,
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-maskable-512.png",
    "/icons/apple-touch-icon.png",
]

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_ASSETS))
    )
    // Updates wait until the user chooses to apply them or closes all app tabs.
})

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then(async (keys) => {
            await Promise.all(
                keys
                    .filter(
                        (key) =>
                            key.startsWith("centscope-public-") &&
                            key !== CACHE_NAME
                    )
                    .map((key) => caches.delete(key))
            )
            await self.clients.claim()
        })
    )
})

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") self.skipWaiting()
})

self.addEventListener("fetch", (event) => {
    const request = event.request
    const url = new URL(request.url)
    // Never intercept mutations, auth/API requests, exports, or RSC requests.
    if (
        request.method !== "GET" ||
        url.origin !== self.location.origin ||
        url.pathname.startsWith("/api/") ||
        url.pathname.includes("/export") ||
        request.headers.has("RSC") ||
        url.searchParams.has("_rsc")
    )
        return

    if (request.mode === "navigate") {
        // No authenticated HTML is stored, even when a response is successful.
        event.respondWith(
            fetch(request).catch(async () => {
                const cache = await caches.open(CACHE_NAME)
                return (await cache.match(OFFLINE_URL)) ?? Response.error()
            })
        )
    } else if (url.search === "" && PUBLIC_ASSETS.includes(url.pathname)) {
        event.respondWith(
            caches
                .open(CACHE_NAME)
                .then(
                    async (cache) =>
                        (await cache.match(url.pathname)) ?? fetch(request)
                )
        )
    }
})
