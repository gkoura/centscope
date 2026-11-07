"use client"

import { getSafeRedirectTo, localization } from "@better-auth-ui/core"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import Link from "@/components/i18n/link"
import { useRouter } from "@/components/i18n/navigation"
import { useMemo, useState, type ReactNode } from "react"
import { useLocale } from "@/components/i18n/locale-provider"
import { translateObject } from "@/lib/i18n/translate"
import { localizeHref } from "@/lib/i18n/config"
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
    const locale = useLocale()
    const messages = useMemo(
        () => translateObject(localization, locale),
        [locale]
    )
    const plugins = useMemo(
        () =>
            authPlugins.map((plugin) => ({
                ...plugin,
                localization: translateObject(plugin.localization, locale),
            })),
        [locale]
    )
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
                plugins={plugins}
                localization={messages}
                baseURL={baseURL}
                socialProviders={googleEnabled ? ["google"] : []}
                multipleAccountsPerProvider={false}
                allowUnlinkingAllAccounts={false}
                redirectTo={localizeHref("/dashboard", locale)}
                basePaths={{ auth: localizeHref("/auth", locale), settings: localizeHref("/settings", locale) }}
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
