"use client"
import { useEffect } from "react"
import { usePathname, useRouter } from "@/components/i18n/navigation"
import { authClient } from "@/lib/auth-client"

export function WorkspaceSessionGuard() {
    const { data: session, isPending, error } = authClient.useSession()
    const pathname = usePathname(),
        router = useRouter()
    useEffect(() => {
        if (isPending || error) return
        if (!session) router.replace("/auth/sign-in")
        else if (!session.user.emailVerified)
            router.replace("/auth/verify-email")
    }, [pathname, session, isPending, error, router])
    return null
}
