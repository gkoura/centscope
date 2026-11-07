import { notFound } from "next/navigation"
import { Auth } from "@/components/auth/auth"
import { getTranslations } from "@/lib/i18n/server"

const titles: Record<string, string> = {
    "sign-in": "Sign In",
    "sign-up": "Sign Up",
    "verify-email": "Verify Email",
    "forgot-password": "Forgot Password",
    "reset-link-sent": "Check your email",
    "reset-password": "Reset Password",
    callback: "Continue",
    error: "Something went wrong",
}

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

export async function AuthContent({
    params,
}: {
    params: Promise<{ path: string }>
}) {
    const { path } = await params
    if (!enabledPaths.has(path)) notFound()
    const t = await getTranslations()
    return (
        <>
            <h1 className="sr-only">{t(titles[path])}</h1>
            <Auth path={path} socialPosition="top" />
        </>
    )
}
