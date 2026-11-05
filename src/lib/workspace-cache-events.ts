"use client"
import { WORKSPACE_REVISION_COOKIE } from "@/lib/workspace-cache-policy"
import { workspaceStorage } from "@/lib/workspace-storage"

export const WORKSPACE_CACHE_EVENT = "fintrack:workspace-cache"
export type WorkspaceCacheEvent = { type: "changed" | "logout" }
export function workspaceRevision() {
    return (
        document.cookie
            .split("; ")
            .find((part) => part.startsWith(`${WORKSPACE_REVISION_COOKIE}=`))
            ?.slice(WORKSPACE_REVISION_COOKIE.length + 1) ?? "initial"
    )
}
export function publishWorkspaceEvent(event: WorkspaceCacheEvent) {
    window.dispatchEvent(
        new CustomEvent(WORKSPACE_CACHE_EVENT, { detail: event })
    )
    if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(WORKSPACE_CACHE_EVENT)
        channel.postMessage(event)
        channel.close()
    }
}
export async function clearWorkspaceCache() {
    publishWorkspaceEvent({ type: "logout" })
    await workspaceStorage.clear().catch(() => {})
}
