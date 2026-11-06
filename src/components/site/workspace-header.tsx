"use client"

import { usePathname } from "next/navigation"
import { usesAccountHeader } from "@/lib/workspace-header"
import { WorkspaceBrand } from "@/components/workspace/workspace-brand"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

export function WorkspaceHeader() {
    const pathname = usePathname()
    if (usesAccountHeader(pathname)) return null
    return (
        <header className="app-topbar">
            <div className="md:hidden">
                <WorkspaceBrand compact />
            </div>
            <div
                role="group"
                aria-label="Appearance and session"
                className="ml-auto flex shrink-0 items-center gap-2 border-l pl-4"
            >
                <ThemeToggle />
                <UserMenu />
            </div>
        </header>
    )
}
