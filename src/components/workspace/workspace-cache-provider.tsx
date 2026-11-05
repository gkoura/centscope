"use client"
import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from "react"
import { dehydrate, hydrate, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import {
    belongsToWorkspace,
    WORKSPACE_CACHE_VERSION,
} from "@/lib/workspace-cache-policy"
import {
    persistedWorkspaceState,
    restoredWorkspaceState,
} from "@/lib/workspace-cache-state"
import { workspaceStorage } from "@/lib/workspace-storage"
import {
    WORKSPACE_CACHE_EVENT,
    workspaceRevision,
    type WorkspaceCacheEvent,
} from "@/lib/workspace-cache-events"

const Scope = createContext({ userId: "", revision: "initial", ready: false })
export const useWorkspaceScope = () => useContext(Scope)

function subscribeRevision(update: () => void) {
    window.addEventListener(WORKSPACE_CACHE_EVENT, update)
    window.addEventListener("focus", update)
    window.addEventListener("pageshow", update)
    return () => {
        window.removeEventListener(WORKSPACE_CACHE_EVENT, update)
        window.removeEventListener("focus", update)
        window.removeEventListener("pageshow", update)
    }
}

export function WorkspaceCacheProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient()
    const { data: session, isPending, error, refetch } = authClient.useSession()
    const revision = useSyncExternalStore(
        subscribeRevision,
        workspaceRevision,
        () => "initial"
    )
    const [revokedSession, setRevokedSession] = useState("")
    const userId =
        session?.user.emailVerified && session.session.id !== revokedSession
            ? session.user.id
            : ""
    const sessionId = session?.session.id ?? ""
    const scopeKey = `${userId}:${sessionId}:${revision}`
    const [restoredScope, setRestoredScope] = useState("")
    const previousUser = useRef("")
    const persistenceAllowed = useRef(true)

    useEffect(() => {
        let stopped = false
        let timer: ReturnType<typeof setTimeout> | undefined
        // A transport failure during session refresh is not a logout.
        if (!userId && (isPending || error)) return
        if (previousUser.current && previousUser.current !== userId) {
            void workspaceStorage.remove(previousUser.current).catch(() => {})
            void queryClient.cancelQueries({
                predicate: (query) => belongsToWorkspace(query.queryKey),
            })
            queryClient.removeQueries({
                predicate: (query) => belongsToWorkspace(query.queryKey),
            })
        }
        previousUser.current = userId
        if (!userId) {
            queryClient.removeQueries({
                predicate: (query) => belongsToWorkspace(query.queryKey),
            })
            void workspaceStorage.clear().catch(() => {})
            return
        }
        persistenceAllowed.current = true
        // A committed write changes the entire user's namespace. This covers transfers and shared wallets.
        queryClient.removeQueries({
            predicate: (query) =>
                belongsToWorkspace(query.queryKey) &&
                !belongsToWorkspace(query.queryKey, userId, revision),
        })

        const persist = () => {
            if (stopped || !persistenceAllowed.current) return
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                if (
                    stopped ||
                    !persistenceAllowed.current ||
                    workspaceRevision() !== revision
                )
                    return
                const state = persistedWorkspaceState(
                    dehydrate(queryClient, {
                        shouldDehydrateMutation: () => false,
                        shouldDehydrateQuery: (query) =>
                            belongsToWorkspace(
                                query.queryKey,
                                userId,
                                revision
                            ) && query.state.data !== undefined,
                    }),
                    userId,
                    revision
                )
                const retained = new Set(
                    state.queries.map((query) => query.queryHash)
                )
                queryClient.removeQueries({
                    predicate: (query) =>
                        belongsToWorkspace(query.queryKey, userId, revision) &&
                        query.getObserversCount() === 0 &&
                        query.state.data !== undefined &&
                        !retained.has(query.queryHash),
                })
                void workspaceStorage
                    .write({
                        version: WORKSPACE_CACHE_VERSION,
                        userId,
                        revision,
                        savedAt: Date.now(),
                        state,
                    })
                    .catch(() => {})
            }, 400)
        }
        let unsubscribe = () => {}
        void (async () => {
            try {
                const saved = await workspaceStorage.read(userId)
                if (stopped) return
                const restored = restoredWorkspaceState(
                    saved,
                    userId,
                    revision,
                    Date.now()
                )
                if (restored) hydrate(queryClient, restored)
                else if (saved) await workspaceStorage.remove(userId)
            } catch {
                /* Storage denial/corruption falls back to the in-memory cache. */
            }
            if (stopped) return
            setRestoredScope(scopeKey)
            unsubscribe = queryClient.getQueryCache().subscribe((event) => {
                if (belongsToWorkspace(event.query.queryKey, userId, revision))
                    persist()
            })
        })()
        return () => {
            stopped = true
            unsubscribe()
            if (timer) clearTimeout(timer)
        }
    }, [queryClient, userId, sessionId, revision, scopeKey, isPending, error])

    useEffect(() => {
        const receive = (event: WorkspaceCacheEvent) => {
            if (event.type === "logout") {
                persistenceAllowed.current = false
                setRevokedSession(sessionId)
                void queryClient.cancelQueries({
                    predicate: (query) => belongsToWorkspace(query.queryKey),
                })
                queryClient.removeQueries({
                    predicate: (query) => belongsToWorkspace(query.queryKey),
                })
                void workspaceStorage.clear().catch(() => {})
                void refetch()
            }
        }
        const local = (event: Event) =>
            receive((event as CustomEvent<WorkspaceCacheEvent>).detail)
        window.addEventListener(WORKSPACE_CACHE_EVENT, local)
        const channel =
            typeof BroadcastChannel !== "undefined"
                ? new BroadcastChannel(WORKSPACE_CACHE_EVENT)
                : null
        if (channel)
            channel.onmessage = (event: MessageEvent<WorkspaceCacheEvent>) => {
                receive(event.data)
                // The revision cookie is shared across tabs, while in-memory queries are not.
                window.dispatchEvent(new Event("focus"))
            }
        return () => {
            window.removeEventListener(WORKSPACE_CACHE_EVENT, local)
            channel?.close()
        }
    }, [queryClient, sessionId, refetch])

    return (
        <Scope.Provider
            value={{
                userId,
                revision,
                ready: !!userId && restoredScope === scopeKey,
            }}
        >
            {children}
        </Scope.Provider>
    )
}
