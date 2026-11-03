"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Plus, ShieldCheck, ArrowUpRight } from "lucide-react"
import { Brand } from "./brand"
import { ThemeToggle } from "./theme-toggle"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    return (
        <div className="app-shell">
            <aside className="app-sidebar">
                <Brand />
                <p className="mt-12 mb-4 text-[10px] font-semibold tracking-[.15em] text-muted-foreground">
                    YOUR WORKSPACE
                </p>
                <nav
                    aria-label="Workspace navigation"
                    className="flex flex-col gap-2"
                >
                    {[
                        {
                            href: "/dashboard",
                            label: "Overview",
                            icon: LayoutDashboard,
                        },
                        {
                            href: "/dashboard/accounts/new",
                            label: "Create account",
                            icon: Plus,
                        },
                        {
                            href: "/settings/security",
                            label: "Sign-in & security",
                            icon: ShieldCheck,
                        },
                    ].map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            aria-current={
                                pathname === href ? "page" : undefined
                            }
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                                pathname === href &&
                                    "bg-accent font-medium text-primary"
                            )}
                        >
                            <Icon className="size-4" />
                            {label}
                        </Link>
                    ))}
                </nav>
                <div className="mt-auto pt-12">
                    <p className="mb-3 text-xs leading-6 text-muted-foreground">
                        A little clarity.
                        <br />A lot more possibility.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs"
                    >
                        Back to Fintrack <ArrowUpRight className="size-3" />
                    </Link>
                </div>
            </aside>
            <div className="min-w-0 flex-1">
                <header className="app-topbar">
                    <Link href="/dashboard" className="text-sm font-medium">
                        Your workspace
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <SignOutButton />
                    </div>
                </header>
                <nav
                    aria-label="Mobile workspace navigation"
                    className="flex gap-5 overflow-x-auto border-b px-5 py-3 text-xs md:hidden"
                >
                    <Link href="/dashboard">Overview</Link>
                    <Link href="/dashboard/accounts/new">Create account</Link>
                    <Link href="/settings/security">Security</Link>
                </nav>
                <div id="main-content" tabIndex={-1} className="app-content">
                    {children}
                </div>
                <footer className="flex flex-wrap justify-between gap-3 border-t px-6 py-5 text-xs text-muted-foreground">
                    <span>Fintrack · Your money, in perspective.</span>
                    <Link href="/">Home</Link>
                </footer>
            </div>
        </div>
    )
}
