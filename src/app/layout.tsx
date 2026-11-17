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
import { PwaProvider } from "@/components/pwa/pwa-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
})

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    interactiveWidget: "resizes-content",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#fafbf8" },
        { media: "(prefers-color-scheme: dark)", color: "#141c18" },
    ],
}

export const metadata: Metadata = {
    applicationName: "CentScope",
    appleWebApp: {
        capable: true,
        title: "CentScope",
        statusBarStyle: "default",
    },
    icons: {
        icon: { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
        apple: "/icons/apple-touch-icon.png",
    },
    title: {
        default: "CentScope — Make sense of every cent.",
        template: "%s | CentScope",
    },
    description:
        "CentScope is a personal finance tracking app. Make sense of every cent.",
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
                    <PwaProvider>
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
                    </PwaProvider>
                </ThemeProvider>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    )
}
