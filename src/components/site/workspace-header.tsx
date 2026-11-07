"use client"

import { LanguageSwitcher } from "@/components/i18n/language-switcher"

import { useTranslations } from "@/components/i18n/locale-provider"

import { usePathname } from "@/components/i18n/navigation"
import { usesAccountHeader } from "@/lib/workspace-header"
import { WorkspaceBrand } from "@/components/workspace/workspace-brand"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

export function WorkspaceHeader() {
    const t = useTranslations()

    const pathname = usePathname()
    if (usesAccountHeader(pathname)) return null
    return (
        <header className="app-topbar">
            <div className="md:hidden">
                <WorkspaceBrand compact />
            </div>
            <div
                role="group"
                aria-label={t("Appearance and session")}
                className="ml-auto flex shrink-0 items-center gap-2 border-l pl-4"
            >
                <LanguageSwitcher />
                <ThemeToggle />
                <UserMenu />
            </div>
        </header>
    )
}
