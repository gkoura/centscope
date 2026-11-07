import "server-only"

import { headers } from "next/headers"
import { redirectLocalized as redirect } from "@/lib/i18n/server-navigation"
import { cache } from "react"
import { auth } from "@/lib/auth"
import { currentRequestSession } from "@/lib/request-session"

export const getCurrentSession = cache(
    async () =>
        currentRequestSession() ??
        auth.api.getSession({ headers: await headers() })
)

export const requireVerifiedSession = cache(async () => {
    const session = await getCurrentSession()
    if (!session) return redirect("/auth/sign-in")
    if (!session.user.emailVerified) return redirect("/auth/verify-email")
    return session
})
