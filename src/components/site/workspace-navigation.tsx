"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import Link from "@/components/i18n/link"
import { useSearchParams } from "next/navigation"
import { usePathname } from "@/components/i18n/navigation"
import {
    LayoutDashboard,
    Layers,
    ArrowLeftRight,
    ChartNoAxesCombined,
    Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { accountViewSearch } from "@/lib/account-period"

function useDestinations() {
    const pathname = usePathname(),
        query = useSearchParams()
    const match = pathname.match(/^\/dashboard\/accounts\/([^/]+)/)
    const id = match && match[1] !== "new" ? match[1] : null
    const base = id ? `/dashboard/accounts/${id}` : "/dashboard"
    return {
        pathname,
        id,
        base,
        items: [
            {
                href: id ? base + accountViewSearch(query, true) : base,
                label: "Overview",
                icon: LayoutDashboard,
                active: pathname === base,
            },
            {
                href: id
                    ? `${base}/transactions${accountViewSearch(query)}`
                    : "/dashboard?section=transactions",
                label: "Transactions",
                icon: ArrowLeftRight,
                active: !!id && pathname.startsWith(`${base}/transactions`),
            },
            {
                href: id
                    ? `${base}/analytics${accountViewSearch(query)}`
                    : "/dashboard?section=analytics",
                label: "Analytics",
                icon: ChartNoAxesCombined,
                active: !!id && pathname.startsWith(`${base}/analytics`),
            },
            {
                href: "/dashboard/accounts",
                label: "Accounts",
                icon: Layers,
                active:
                    pathname === "/dashboard/accounts" ||
                    pathname === "/dashboard/accounts/new",
            },
        ],
    }
}
export function WorkspaceNavigation() {
    const t = useTranslations()

    const { items } = useDestinations()
    return (
        <>
            {items.map(({ href, label, icon: Icon, active }) => (
                <Link
                    key={t(label || "")}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                        active && "bg-accent font-medium text-primary"
                    )}
                >
                    <Icon className="size-4" />
                    {t(label || "")}
                </Link>
            ))}
        </>
    )
}
export function WorkspaceNavigationFallback() {
    const t = useTranslations()

    return (
        <Link href="/dashboard" className="flex items-center gap-3 p-3 text-sm">
            <LayoutDashboard className="size-4" />
            {t("Overview")}
        </Link>
    )
}
export function MobileWorkspaceNavigation() {
    const t = useTranslations()

    const { items } = useDestinations()
    return (
        <nav aria-label={t("Main navigation")} className="mobile-bottom-nav">
            {items.map(({ href, label, icon: Icon, active }) => (
                <Link
                    key={t(label || "")}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn("mobile-nav-item", active && "text-primary")}
                >
                    <Icon
                        className="size-5"
                        strokeWidth={active ? 2.25 : 1.7}
                        aria-hidden="true"
                    />
                    <span>{t(label || "")}</span>
                </Link>
            ))}
        </nav>
    )
}

export function SidebarSettingsLink({ active = false }: { active?: boolean }) {
    const t = useTranslations()

    return (
        <Link
            href="/settings/security"
            aria-current={active ? "page" : undefined}
            className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                active && "bg-accent font-medium text-primary"
            )}
        >
            <Settings2 className="size-4" aria-hidden="true" />
            {t("Settings")}
        </Link>
    )
}

export function SidebarSettingsNavigation() {
    const pathname = usePathname()
    return <SidebarSettingsLink active={pathname.startsWith("/settings")} />
}
