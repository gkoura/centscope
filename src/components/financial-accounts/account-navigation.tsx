"use client"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectGroup,
    SelectItem,
} from "@/components/ui/select"
import { UserMenu } from "@/components/site/user-menu"
import { AccountThemePicker } from "./account-theme-picker"
import { accountTheme } from "@/lib/account-theme"
import { ThemeToggle } from "@/components/site/theme-toggle"
export function AccountNavigation({
    accountId,
    accounts,
    shared,
    theme,
    isOwner,
}: {
    accountId: string
    theme: string
    isOwner: boolean
    accounts: { id: string; name: string; theme?: string }[]
    shared: { id: string; name: string; theme?: string }[]
}) {
    const pathname = usePathname(),
        query = useSearchParams(),
        router = useRouter()
    const [pending, startTransition] = useTransition()
    const base = `/dashboard/accounts/${accountId}`
    const inTransactions = pathname.startsWith(`${base}/transactions`)
    const inAnalytics = pathname.startsWith(`${base}/analytics`)
    const options = accounts
        .map((account) => ({
            value: account.id,
            label: account.name,
            theme: account.theme,
        }))
        .concat(
            shared.map((a) => ({
                value: a.id,
                label: a.name + " · Shared",
                theme: a.theme,
            }))
        )
    function switchAccount(id: string | null) {
        if (!id || id === accountId) return
        const next = new URLSearchParams()
        for (const key of ["view", "month", "year", "from", "to"]) {
            const value = query.get(key)
            if (value) next.set(key, value)
        }
        startTransition(() =>
            router.push(
                `/dashboard/accounts/${id}${inTransactions ? "/transactions" : inAnalytics ? "/analytics" : ""}${next.size ? `?${next}` : ""}`
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
                            <span
                                className="size-3 shrink-0 rounded-full bg-primary"
                                aria-hidden="true"
                            />
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
                                        <span
                                            className="size-3 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: accountTheme(
                                                    option.theme
                                                ).color,
                                            }}
                                            aria-hidden="true"
                                        />
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                <div
                    role="group"
                    aria-label="Appearance and session"
                    className="ml-auto flex shrink-0 items-center gap-1 border-l pl-3 md:pl-5"
                >
                    <AccountThemePicker
                        key={accountId}
                        accountId={accountId}
                        theme={theme}
                        isOwner={isOwner}
                    />
                    <ThemeToggle />
                    <UserMenu />
                </div>
            </div>
        </header>
    )
}
