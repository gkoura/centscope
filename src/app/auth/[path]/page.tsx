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
        <>
            <h1 className="sr-only">
                {path
                    .split("-")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
            </h1>
            <Auth path={path} socialPosition="top" />
        </>
    )
}
