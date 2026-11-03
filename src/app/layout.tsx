import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { AuthProviders } from "@/components/auth-providers"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
})

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
                    </AuthProviders>
                </ThemeProvider>
            </body>
        </html>
    )
}
