"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function TransactionCreateMenu({
    accountId,
    returnTo,
    date,
    walletId,
    hasWallets,
}: {
    accountId: string
    returnTo: string
    date: string
    walletId?: string
    hasWallets: boolean
}) {
    const [instant, setInstant] = useState(false)
    const base = `/dashboard/accounts/${accountId}/transactions`
    const transactionHref = (type: "EXPENSE" | "INCOME") =>
        `${base}/new?${new URLSearchParams({
            type,
            returnTo,
            date,
            ...(walletId ? { wallet: walletId } : {}),
        })}`

    if (!hasWallets)
        return (
            <Button
                nativeButton={false}
                render={
                    <Link
                        href={`/dashboard/accounts/${accountId}/wallets/new`}
                    />
                }
                size="icon-lg"
                className="transaction-add-button"
                aria-label="Add your first wallet"
            >
                <Plus aria-hidden="true" />
            </Button>
        )

    return (
        <DropdownMenu
            modal={false}
            onOpenChange={(_open, details) => {
                const event = details.event
                setInstant(
                    event.type.startsWith("key") ||
                        (event.type === "click" &&
                            event instanceof MouseEvent &&
                            event.detail === 0)
                )
            }}
        >
            <DropdownMenuTrigger
                render={
                    <Button size="icon-lg" className="transaction-add-button" />
                }
                aria-label="Add transaction"
                data-quick-create-instant={instant || undefined}
            >
                <Plus aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={12}
                className="transaction-create-menu"
                data-quick-create-instant={instant || undefined}
            >
                <DropdownMenuGroup>
                    {[
                        {
                            label: "Expense",
                            icon: ArrowUpRight,
                            flow: "expense",
                            href: transactionHref("EXPENSE"),
                        },
                        {
                            label: "Income",
                            icon: ArrowDownLeft,
                            flow: "income",
                            href: transactionHref("INCOME"),
                        },
                        {
                            label: "Transfer",
                            icon: ArrowLeftRight,
                            flow: undefined,
                            href: `${base}/transfer/new?${new URLSearchParams({
                                returnTo,
                                date,
                                ...(walletId ? { source: walletId } : {}),
                            })}`,
                        },
                    ].map(({ label, icon: Icon, flow, href }) => (
                        <DropdownMenuItem
                            key={label}
                            render={<Link href={href} />}
                            className="min-h-14 gap-3 rounded-xl px-3"
                        >
                            <span
                                className="transaction-create-icon"
                                data-flow={flow}
                            >
                                <Icon aria-hidden="true" />
                            </span>
                            <span className="font-medium">{label}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
