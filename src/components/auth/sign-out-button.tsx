"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { clearWorkspaceCache } from "@/lib/workspace-cache-events"

export function SignOutButton({ compact = false }: { compact?: boolean }) {
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
    return (
        <Button
            variant="outline"
            disabled={pending}
            onClick={signOut}
            aria-label={pending ? "Signing out…" : "Sign out"}
            title="Sign out"
            className={
                compact ? "size-11 shrink-0 sm:w-auto sm:px-3" : undefined
            }
        >
            {compact && <LogOut className="sm:hidden" aria-hidden="true" />}
            <span className={compact ? "hidden sm:inline" : undefined}>
                {pending ? "Signing out…" : "Sign out"}
            </span>
        </Button>
    )
}
