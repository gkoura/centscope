import type { Metadata, Viewport } from "next"
import { Geist_Mono, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { AuthProviders } from "@/components/auth-providers"
import { Suspense } from "react"
import { WorkspaceRevisionSignal } from "@/components/workspace/workspace-revision-signal"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

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

export const metadata: Metadata = {
    title: {
        default: "Fintrack — Your money, in perspective",
        template: "%s | Fintrack",
    },
    description:
        "A calmer place to organize your financial accounts. Give every purpose a place with Fintrack.",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn(
                "antialiased",
                fontMono.variable,
                "font-sans",
                inter.variable
            )}
        >
            <body>
                <a href="#main-content" className="skip-link">
                    Skip to content
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
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    )
}
