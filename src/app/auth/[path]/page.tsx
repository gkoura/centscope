import { notFound } from "next/navigation"
import { Auth } from "@/components/auth/auth"

const enabledPaths = new Set([
    "sign-in",
    "sign-up",
    "verify-email",
    "forgot-password",
    "reset-link-sent",
    "reset-password",
    "callback",
    "error",
])

export default async function AuthPage({
    params,
}: {
    params: Promise<{ path: string }>
}) {
    const { path } = await params
    if (!enabledPaths.has(path)) notFound()
    return (
        <main className="flex min-h-svh items-center justify-center p-4 sm:p-8">
            <Auth path={path} />
        </main>
    )
}
