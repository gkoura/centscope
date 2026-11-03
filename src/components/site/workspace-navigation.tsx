"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Plus, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function WorkspaceNavigation() {
    const pathname = usePathname()
    return (
        <>
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
                    aria-current={pathname === href ? "page" : undefined}
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
        </>
    )
}

export function WorkspaceNavigationFallback() {
    return (
        <>
            <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground"
            >
                <LayoutDashboard className="size-4" />
                Overview
            </Link>
            <Link
                href="/dashboard/accounts/new"
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground"
            >
                <Plus className="size-4" />
                Create account
            </Link>
            <Link
                href="/settings/security"
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground"
            >
                <ShieldCheck className="size-4" />
                Sign-in &amp; security
            </Link>
        </>
    )
}
