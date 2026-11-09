"use client"
import { useQueryClient } from "@tanstack/react-query"
import type { WorkspaceRequest } from "@/lib/workspace-cache-policy"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
export function MemberRefresh({ accountId }: { accountId: string }) {
    const router = useRouter()
    const client = useQueryClient()
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState !== "visible") return
            router.refresh()
            void client.invalidateQueries({
                predicate: (q) =>
                    q.queryKey[0] === "workspace" &&
                    (q.queryKey[4] as WorkspaceRequest)?.accountId ===
                        accountId,
            })
        }
        const restore = (event: PageTransitionEvent) => {
            if (event.persisted) refresh()
        }
        const timer = setInterval(refresh, 30000)
        window.addEventListener("focus", refresh)
        window.addEventListener("pageshow", restore)
        document.addEventListener("visibilitychange", refresh)
        return () => {
            clearInterval(timer)
            window.removeEventListener("focus", refresh)
            window.removeEventListener("pageshow", restore)
            document.removeEventListener("visibilitychange", refresh)
        }
    }, [router, client, accountId])
    return null
}
