"use client"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { ArrowLeftRight, LayoutDashboard } from "lucide-react"
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectGroup,
    SelectItem,
} from "@/components/ui/select"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { cn } from "@/lib/utils"
import { accountViewSearch } from "@/lib/account-period"
export function AccountNavigation({
    accountId,
    accounts,
}: {
    accountId: string
    accounts: { id: string; name: string }[]
}) {
    const pathname = usePathname(),
        query = useSearchParams(),
        router = useRouter()
    const [pending, startTransition] = useTransition()
    const base = `/dashboard/accounts/${accountId}`
    const inTransactions = pathname.startsWith(`${base}/transactions`)
    const options = accounts.map((account) => ({
        value: account.id,
        label: account.name,
    }))
    function switchAccount(id: string | null) {
        if (!id || id === accountId) return
        const next = new URLSearchParams()
        for (const key of ["view", "month", "year", "from", "to"]) {
            const value = query.get(key)
            if (value) next.set(key, value)
        }
        startTransition(() =>
            router.push(
                `/dashboard/accounts/${id}${inTransactions ? "/transactions" : ""}${next.size ? `?${next}` : ""}`
            )
        )
    }
    return (
        <header className="account-toolbar" aria-busy={pending}>
            <div className="account-toolbar-inner">
                <div className="min-w-0 flex-1 md:max-w-64">
                    <span className="mb-1 block text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
                        Account
                    </span>
                    <Select
                        value={accountId}
                        items={options}
                        onValueChange={switchAccount}
                    >
                        <SelectTrigger
                            aria-label="Switch account"
                            className="h-11 w-full min-w-0 border-0 bg-transparent px-3 shadow-none"
                        >
                            <SelectValue className="truncate" />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                            <SelectGroup className="p-2">
                                {options.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        className="min-h-11 px-3 py-2"
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                <nav
                    aria-label="Account views"
                    className="order-3 hidden w-full shrink-0 items-center gap-2 md:flex lg:order-none lg:w-auto"
                >
                    {[
                        {
                            href: base + accountViewSearch(query, true),
                            label: "Overview",
                            icon: LayoutDashboard,
                            active: pathname === base,
                        },
                        {
                            href: `${base}/transactions${accountViewSearch(query)}`,
                            label: "Transactions",
                            icon: ArrowLeftRight,
                            active: inTransactions,
                        },
                    ].map(({ href, label, icon: Icon, active }) => (
                        <Link
                            key={label}
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm",
                                active
                                    ? "bg-primary/10 font-medium text-primary"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <Icon className="size-4" />
                            {label}
                        </Link>
                    ))}
                </nav>
                <div
                    role="group"
                    aria-label="Appearance and session"
                    className="ml-auto flex shrink-0 items-center gap-1 border-l pl-3 md:pl-5"
                >
                    <ThemeToggle />

                    <SignOutButton compact />
                </div>
            </div>
        </header>
    )
}
