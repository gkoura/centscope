"use client"

import { getSafeRedirectTo } from "@better-auth-ui/core"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { AuthProvider } from "@/components/auth/auth-provider"
import { Toaster } from "@/components/ui/sonner"
import { authClient } from "@/lib/auth-client"
import { WorkspaceCacheProvider } from "@/components/workspace/workspace-cache-provider"
import { deleteUserPlugin } from "@/lib/auth/delete-user-plugin"

const authPlugins = [
    deleteUserPlugin({
        sendDeleteAccountVerification: true,
        localization: {
            deleteAccountDescription:
                "Permanently delete your account, financial accounts, wallets, transactions, categories and recurring schedules. This cannot be undone. We’ll email you a confirmation link before deleting anything.",
        },
    }),
]

export function AuthProviders({
    children,
    baseURL,
    googleEnabled,
}: {
    children: ReactNode
    baseURL?: string
    googleEnabled: boolean
}) {
    const router = useRouter()
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: { queries: { staleTime: 5_000 } },
            })
    )
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider
                authClient={authClient}
                plugins={authPlugins}
                baseURL={baseURL}
                socialProviders={googleEnabled ? ["google"] : []}
                multipleAccountsPerProvider={false}
                allowUnlinkingAllAccounts={false}
                redirectTo="/dashboard"
                emailAndPassword={{
                    enabled: true,
                    requireEmailVerification: true,
                    minPasswordLength: 15,
                    maxPasswordLength: 128,
                    confirmPassword: true,
                    forgotPassword: true,
                }}
                navigate={({ to, replace }) => {
                    const destination = getSafeRedirectTo(
                        to,
                        window.location.origin
                    )
                    if (replace) router.replace(destination)
                    else router.push(destination)
                    router.refresh()
                }}
                Link={Link}
            >
                <WorkspaceCacheProvider>{children}</WorkspaceCacheProvider>
                <Toaster />
            </AuthProvider>
        </QueryClientProvider>
    )
}
