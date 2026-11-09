import type { ReactNode } from "react"
import Link from "next/link"
import { LayoutDashboard, Wallet, Users } from "lucide-react"
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
                <Button
                    variant="outline"
                    render={<Link href={base} />}
                    nativeButton={false}
                >
                    <LayoutDashboard data-icon="inline-start" />
                    Overview
                </Button>
                <Button
                    variant="outline"
                    render={<Link href={`${base}/wallets`} />}
                    nativeButton={false}
                >
                    <Wallet data-icon="inline-start" />
                    Wallets
                </Button>
                {isOwner && (
                    <Button
                        variant="outline"
                        render={
                            <Link href={`/dashboard/sharing/${account.id}`} />
                        }
                        nativeButton={false}
                    >
                        <Users data-icon="inline-start" />
                        Sharing
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
