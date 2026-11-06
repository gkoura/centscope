"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSignOut } from "@/lib/auth/use-sign-out"

export function SignOutButton({ compact = false }: { compact?: boolean }) {
    const { signOut, pending } = useSignOut()
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
