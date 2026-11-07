"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import Link from "@/components/i18n/link"
import {
    Settings2,
    Plus,
    Tags,
    ChartNoAxesCombined,
    Layers,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function AccountTools({ accountId }: { accountId: string }) {
    const t = useTranslations()

    const base = `/dashboard/accounts/${accountId}`
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="outline" size="lg" className="h-11" />}
                aria-label={t("Account tools")}
            >
                <Settings2 data-icon="inline-start" />
                {t("Account tools")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>{t("Account tools")}</DropdownMenuLabel>
                    {[
                        {
                            href: `${base}/wallets/new`,
                            label: t("Add wallet"),
                            icon: Plus,
                        },
                        {
                            href: `${base}/categories`,
                            label: t("Categories"),
                            icon: Tags,
                        },
                        {
                            href: `${base}/analytics`,
                            label: t("Analytics"),
                            icon: ChartNoAxesCombined,
                        },
                    ].map(({ href, label, icon: Icon }) => (
                        <DropdownMenuItem
                            key={href}
                            render={<Link href={href} />}
                        >
                            <Icon />
                            {t(label || "")}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        render={<Link href="/dashboard/accounts" />}
                    >
                        <Layers />
                        {t("Manage accounts & order")}
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
