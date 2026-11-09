import type { ReactNode } from "react"
import Link from "next/link"
import { LayoutDashboard, Wallet, Users } from "lucide-react"
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
    account: { id: string; name: string; reportingCurrency: string }
    isOwner: boolean
    status: ReactNode
    handle?: ReactNode
    extraAction?: ReactNode
}) {
    const base = `/dashboard/accounts/${account.id}`
    return (
        <Card className="h-full">
            <CardHeader className={handle ? "relative pr-14" : undefined}>
                <CardTitle>
                    <h2 className="wrap-break-word">{account.name}</h2>
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
                {extraAction}
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
