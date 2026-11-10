import type { ReactNode } from "react"
import Link from "next/link"
import { LayoutDashboard, Tags, Wallet, Users } from "lucide-react"
import { AccountThemePicker } from "./account-theme-picker"
import { accountTheme } from "@/lib/account-theme"
import { currencySymbol } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card"

export function AccountCard({
    account,
    isOwner,
    status,
    handle,
    extraAction,
}: {
    account: {
        id: string
        name: string
        reportingCurrency: string
        theme?: string
    }
    isOwner: boolean
    status: ReactNode
    handle?: ReactNode
    extraAction?: ReactNode
}) {
    const base = `/dashboard/accounts/${account.id}`

    const navigationItems = [
        {
            label: "Overview",
            href: base,
            icon: LayoutDashboard,
            visible: true,
        },
        {
            label: "Categories",
            href: `${base}/categories`,
            icon: Tags,
            visible: true,
        },
        {
            label: "Wallets",
            href: `${base}/wallets`,
            icon: Wallet,
            visible: true,
        },
        {
            label: "Sharing",
            href: `/dashboard/sharing/${account.id}`,
            icon: Users,
            visible: isOwner,
        },
    ]

    return (
        <Card
            className="h-full border-t-[3px]"
            style={{ borderTopColor: accountTheme(account.theme).color }}
        >
            <CardHeader className={handle ? "relative pr-14" : undefined}>
                <CardTitle>
                    <h2 className="flex items-center gap-2 wrap-break-word">
                        <span
                            className="size-3 shrink-0 rounded-full"
                            style={{
                                backgroundColor: accountTheme(account.theme)
                                    .color,
                            }}
                            aria-hidden="true"
                        />
                        {account.name}
                    </h2>
                </CardTitle>
                <CardDescription>
                    Reporting currency{" "}
                    {currencySymbol(account.reportingCurrency)}
                </CardDescription>
                {handle && (
                    <div className="absolute top-0 right-3">{handle}</div>
                )}
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
                {status}
                <div className="flex flex-wrap items-center gap-2">
                    {extraAction}
                    <AccountThemePicker
                        accountId={account.id}
                        accountName={account.name}
                        theme={account.theme ?? "forest"}
                        isOwner={isOwner}
                        showLabel
                    />
                </div>
            </CardContent>
            <CardFooter
                className="mt-auto flex-wrap gap-2"
                role="navigation"
                aria-label={`Navigate ${account.name}`}
            >
                {navigationItems
                    .filter((item) => item.visible)
                    .map(({ label, href, icon: Icon }) => (
                        <Button
                            key={label}
                            variant="outline"
                            render={<Link href={href} />}
                            nativeButton={false}
                        >
                            <Icon data-icon="inline-start" />
                            {label}
                        </Button>
                    ))}
            </CardFooter>
        </Card>
    )
}
