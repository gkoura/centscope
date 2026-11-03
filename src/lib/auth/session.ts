import "server-only"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"
import { auth } from "@/lib/auth"

export const requireVerifiedSession = cache(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) redirect("/auth/sign-in")
    if (!session.user.emailVerified) redirect("/auth/verify-email")
    return session
})
