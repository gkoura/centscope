import { getTranslations } from "@/lib/i18n/server"
import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "../globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { AuthProviders } from "@/components/auth-providers"
import { Suspense } from "react"
import { LocaleProvider } from "@/components/i18n/locale-provider"
import { getLocale } from "@/lib/i18n/server"
import { locales } from "@/lib/i18n/config"
import { WorkspaceRevisionSignal } from "@/components/workspace/workspace-revision-signal"

const inter = Inter({ subsets: ["latin", "greek"], variable: "--font-sans" })

const fontMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
})

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#fafbf8" },
        { media: "(prefers-color-scheme: dark)", color: "#141c18" },
    ],
}

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations()
    return {
        applicationName: "CentScope",
        title: {
            default: t("CentScope — Make sense of every cent."),
            template: "%s | CentScope",
        },
        description: t(
            "CentScope is a personal finance tracking app. Make sense of every cent."
        ),
    }
}

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }))
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const t = await getTranslations()

    const locale = await getLocale()
    return (
        <html
            lang={locale}
            suppressHydrationWarning
            className={cn(
                "antialiased",
                fontMono.variable,
                "font-sans",
                inter.variable
            )}
        >
            <body>
                <LocaleProvider locale={locale}>
                    <a href="#main-content" className="skip-link">
                        {t(t("Skip to content"))}
                    </a>
                    <ThemeProvider>
                        <AuthProviders
                            baseURL={process.env.BETTER_AUTH_URL}
                            googleEnabled={Boolean(
                                process.env.GOOGLE_CLIENT_ID &&
                                process.env.GOOGLE_CLIENT_SECRET
                            )}
                        >
                            {children}
                            <Suspense fallback={null}>
                                <WorkspaceRevisionSignal />
                            </Suspense>
                        </AuthProviders>
                    </ThemeProvider>
                </LocaleProvider>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    )
}
