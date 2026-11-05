import Link from "next/link"
import { Suspense } from "react"
import { Brand } from "./brand"
import { ThemeToggle } from "./theme-toggle"
import { SignOutButton } from "@/components/auth/sign-out-button"
import {
    MobileWorkspaceNavigation,
    WorkspaceNavigation,
    WorkspaceNavigationFallback,
} from "./workspace-navigation"
export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-shell">
            <aside className="app-sidebar">
                <Brand href="/dashboard" />
                <p className="mt-10 mb-3 text-[10px] font-semibold tracking-[.15em] text-muted-foreground">
                    YOUR WORKSPACE
                </p>
                <nav
                    aria-label="Workspace navigation"
                    className="flex flex-col gap-2"
                >
                    <Suspense fallback={<WorkspaceNavigationFallback />}>
                        <WorkspaceNavigation />
                    </Suspense>
                </nav>
                <div className="mt-auto flex flex-col gap-4 pt-10">
                    <div className="flex items-center justify-between">
                        <ThemeToggle />
                    </div>
                    <p className="text-xs leading-6 text-muted-foreground">
                        A little clarity.
                        <br />A lot more possibility.
                    </p>
                </div>
            </aside>
            <div className="min-w-0 flex-1">
                <header className="app-topbar">
                    <Link
                        href="/dashboard"
                        className="font-semibold tracking-tight"
                    >
                        fintrack<span className="text-primary">.</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <SignOutButton />
                    </div>
                </header>
                <div id="main-content" tabIndex={-1} className="app-content">
                    {children}
                </div>
                <footer className="app-footer">
                    <span>Fintrack · Your money, in perspective.</span>
                    <Link href="/dashboard/accounts">Manage accounts</Link>
                </footer>
            </div>
            <Suspense fallback={null}>
                <MobileWorkspaceNavigation />
            </Suspense>
        </div>
    )
}
