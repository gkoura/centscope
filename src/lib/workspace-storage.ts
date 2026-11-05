import { WORKSPACE_CACHE_VERSION } from "./workspace-cache-policy"
import type { SavedWorkspace } from "./workspace-cache-state"

// Only financial query results go here; authentication/session queries are never persisted.
async function database() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(
            "fintrack-workspace",
            WORKSPACE_CACHE_VERSION
        )
        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains("users"))
                db.createObjectStore("users")
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        request.onblocked = () => reject(new Error("Browser storage is busy."))
    })
}
async function operation<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
    const db = await database()
    try {
        return await new Promise<T>((resolve, reject) => {
            const transaction = db.transaction("users", mode)
            const request = run(transaction.objectStore("users"))
            transaction.oncomplete = () => resolve(request.result)
            transaction.onerror = () => reject(transaction.error)
            transaction.onabort = () => reject(transaction.error)
        })
    } finally {
        db.close()
    }
}

// Serialize this tab's writes and erases so a pending save cannot undo logout.
let queue: Promise<unknown> = Promise.resolve()
function serial<T>(run: () => Promise<T>): Promise<T> {
    const next = queue.then(run, run)
    queue = next.catch(() => {})
    return next
}
export const workspaceStorage = {
    read: (userId: string) =>
        operation<SavedWorkspace | undefined>("readonly", (store) =>
            store.get(userId)
        ),
    write: (value: SavedWorkspace) =>
        serial(() =>
            operation("readwrite", (store) => store.put(value, value.userId))
        ),
    remove: (userId: string) =>
        serial(() => operation("readwrite", (store) => store.delete(userId))),
    clear: () => serial(() => operation("readwrite", (store) => store.clear())),
}
