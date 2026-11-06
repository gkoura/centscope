import Link from "next/link"
import {
    Settings2,
    Plus,
    Tags,
    Repeat2,
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
    const base = `/dashboard/accounts/${accountId}`
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="outline" size="lg" className="h-11" />}
                aria-label="Account tools"
            >
                <Settings2 data-icon="inline-start" />
                Account tools
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Account tools</DropdownMenuLabel>
                    {[
                        {
                            href: `${base}/wallets/new`,
                            label: "Add wallet",
                            icon: Plus,
                        },
                        {
                            href: `${base}/categories`,
                            label: "Categories",
                            icon: Tags,
                        },
                        {
                            href: `${base}/recurring`,
                            label: "Recurring transactions",
                            icon: Repeat2,
                        },
                        {
                            href: `${base}/analysis`,
                            label: "Detailed analysis",
                            icon: ChartNoAxesCombined,
                        },
                    ].map(({ href, label, icon: Icon }) => (
                        <DropdownMenuItem
                            key={href}
                            render={<Link href={href} />}
                        >
                            <Icon />
                            {label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        render={<Link href="/dashboard/accounts" />}
                    >
                        <Layers />
                        Manage accounts & order
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
