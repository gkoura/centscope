import Link from "next/link"
import { Suspense } from "react"
import { WorkspaceBrand } from "@/components/workspace/workspace-brand"
import { WorkspaceCacheStatus } from "@/components/workspace/workspace-cache-status"
import { WorkspaceSessionGuard } from "@/components/workspace/workspace-session-guard"
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
            <Suspense fallback={null}>
                <WorkspaceSessionGuard />
            </Suspense>
            <aside className="app-sidebar">
                <WorkspaceBrand />
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
                        Your money, in focus.
                    </p>
                </div>
            </aside>
            <div className="min-w-0 flex-1">
                <header className="app-topbar">
                    <WorkspaceBrand compact />
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <SignOutButton />
                    </div>
                </header>
                <div id="main-content" tabIndex={-1} className="app-content">
                    <WorkspaceCacheStatus />
                    {children}
                </div>
                <footer className="app-footer">
                    <span>CentScope · Your money, in focus.</span>
                    <Link href="/dashboard/accounts">Manage accounts</Link>
                </footer>
            </div>
            <Suspense fallback={null}>
                <MobileWorkspaceNavigation />
            </Suspense>
        </div>
    )
}
