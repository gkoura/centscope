"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { clearWorkspaceCache } from "@/lib/workspace-cache-events"

export function useSignOut() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [pending, setPending] = useState(false)
    async function signOut() {
        setPending(true)
        try {
            const { error } = await authClient.signOut()
            if (error) throw new Error("Unable to sign out.")
            await clearWorkspaceCache()
            await queryClient.cancelQueries()
            queryClient.clear()
            router.replace("/auth/sign-in")
            router.refresh()
        } catch {
            toast.error("Unable to sign out. Please try again.")
        } finally {
            setPending(false)
        }
    }
    return { signOut, pending }
}
