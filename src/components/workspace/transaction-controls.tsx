"use client"
import { periodEntryDate } from "@/lib/transaction-return"
import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    Search,
    SlidersHorizontal,
    MoreHorizontal,
    Plus,
    ArrowLeftRight,
    Upload,
    Repeat2,
} from "lucide-react"
import { periodQuery, type AccountPeriod } from "@/lib/account-period"
import type { TransactionFilters } from "@/lib/transaction-filters"
import { Button } from "@/components/ui/button"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupButton,
} from "@/components/ui/input-group"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { walletFilterIds } from "@/lib/transaction-filters"
import {
    FieldGroup,
    Field,
    FieldLabel,
    FieldSet,
    FieldLegend,
    FieldDescription,
} from "@/components/ui/field"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

export function TransactionControls({
    accountId,
    period,
    filters,
    wallets,
    categories,
}: {
    accountId: string
    period: AccountPeriod
    filters: TransactionFilters
    wallets: { id: string; name: string; currency: string }[]
    categories: { id: string; name: string }[]
}) {
    const [open, setOpen] = useState(false),
        [pending, startTransition] = useTransition(),
        router = useRouter()
    const selectedWallets = walletFilterIds(filters.wallet)
    const singleWallet =
        selectedWallets.length === 1 ? selectedWallets[0] : undefined
    const base = `/dashboard/accounts/${accountId}/transactions`
    const active = [
        filters.type,
        filters.status,
        filters.wallet,
        filters.category,
    ].filter(Boolean).length
    const current = new URLSearchParams({
        ...periodQuery(period),
        ...Object.fromEntries(
            Object.entries(filters).filter(
                ([key, value]) => value && key !== "from" && key !== "to"
            )
        ),
    })
    const returnTo = `${base}?${current}`
    function navigate(form: HTMLFormElement, searchOnly = false) {
        const next = new URLSearchParams(periodQuery(period))
        if (searchOnly)
            for (const key of ["type", "status", "wallet", "category"]) {
                const value = filters[key as keyof TransactionFilters]
                if (value) next.set(key, value)
            }
        const data = new FormData(form)
        for (const [key, value] of data)
            if (key !== "wallet" && typeof value === "string" && value.trim())
                next.set(key, value.trim())
        if (!searchOnly) {
            const selected = walletFilterIds(
                data
                    .getAll("wallet")
                    .filter(
                        (value): value is string => typeof value === "string"
                    )
            )
            if (selected.length) next.set("wallet", selected.join(","))
        }
        setOpen(false)
        startTransition(() => router.push(`${base}?${next}`, { scroll: false }))
    }
    return (
        <div aria-busy={pending} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <form
                    role="search"
                    className="min-w-0 flex-1"
                    key={filters.q ?? ""}
                    onSubmit={(event) => {
                        event.preventDefault()
                        navigate(event.currentTarget, true)
                    }}
                >
                    <InputGroup className="h-11">
                        <InputGroupAddon>
                            <Search aria-hidden="true" />
                        </InputGroupAddon>
                        <InputGroupInput
                            aria-label="Search transactions"
                            name="q"
                            defaultValue={filters.q}
                            maxLength={120}
                            placeholder="Search transactions…"
                        />
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                type="submit"
                                aria-label="Run search"
                            >
                                <Search />
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                </form>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger
                        render={<Button variant="outline" className="h-11" />}
                        aria-label={`Filter transactions${active ? `, ${active} active` : ""}`}
                    >
                        <SlidersHorizontal />
                        <span className="hidden sm:inline">Filters</span>
                        {active > 0 && <span>{active}</span>}
                    </DialogTrigger>
                    <DialogContent className="max-h-[85dvh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Filter transactions</DialogTitle>
                            <DialogDescription>
                                Refine the selected period by wallet, category,
                                type, or status.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            key={JSON.stringify(filters)}
                            className="flex flex-col gap-5"
                            onSubmit={(event) => {
                                event.preventDefault()
                                navigate(event.currentTarget)
                            }}
                        >
                            <input
                                type="hidden"
                                name="q"
                                value={filters.q ?? ""}
                            />
                            <FieldGroup>
                                {[
                                    {
                                        name: "type",
                                        label: "Type",
                                        options: [
                                            { id: "EXPENSE", name: "Expenses" },
                                            { id: "INCOME", name: "Income" },
                                            {
                                                id: "TRANSFER",
                                                name: "Transfers",
                                            },
                                            {
                                                id: "OPENING_BALANCE",
                                                name: "Opening balances",
                                            },
                                        ],
                                    },
                                    {
                                        name: "status",
                                        label: "Status",
                                        options: [
                                            { id: "POSTED", name: "Posted" },
                                            { id: "PENDING", name: "Pending" },
                                        ],
                                    },
                                    {
                                        name: "category",
                                        label: "Category",
                                        options: categories,
                                    },
                                ].map((field) => (
                                    <Field key={field.name}>
                                        <FieldLabel
                                            htmlFor={`filter-${field.name}`}
                                        >
                                            {field.label}
                                        </FieldLabel>
                                        <select
                                            id={`filter-${field.name}`}
                                            name={field.name}
                                            defaultValue={
                                                filters[
                                                    field.name as keyof TransactionFilters
                                                ] ?? ""
                                            }
                                            className="h-11 w-full rounded-lg border bg-background px-3 text-base sm:text-sm"
                                        >
                                            <option value="">All</option>
                                            {field.options.map((option) => (
                                                <option
                                                    key={option.id}
                                                    value={option.id}
                                                >
                                                    {option.name}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                ))}
                                <FieldSet>
                                    <FieldLegend>Wallets</FieldLegend>
                                    <FieldDescription>
                                        Select any combination. No selection
                                        includes all wallets.
                                    </FieldDescription>
                                    <FieldGroup className="gap-3">
                                        {wallets.map((wallet) => (
                                            <Field
                                                key={wallet.id}
                                                orientation="horizontal"
                                            >
                                                <Checkbox
                                                    id={`filter-wallet-${wallet.id}`}
                                                    name="wallet"
                                                    value={wallet.id}
                                                    defaultChecked={selectedWallets.includes(
                                                        wallet.id
                                                    )}
                                                />
                                                <FieldLabel
                                                    htmlFor={`filter-wallet-${wallet.id}`}
                                                >
                                                    {wallet.name} ·{" "}
                                                    {wallet.currency}
                                                </FieldLabel>
                                            </Field>
                                        ))}
                                    </FieldGroup>
                                </FieldSet>
                            </FieldGroup>
                            <div className="flex justify-end gap-2">
                                <DialogClose
                                    render={<Button variant="outline" />}
                                >
                                    Cancel
                                </DialogClose>
                                <Button type="submit">Apply filters</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant="outline"
                                size="icon-lg"
                                className="size-11"
                            />
                        }
                        aria-label="Transaction tools"
                    >
                        <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuGroup>
                            {[
                                {
                                    href: `${base}/transfer/new?${new URLSearchParams({ returnTo, date: periodEntryDate(period, new Date().toISOString().slice(0, 10)), ...(singleWallet ? { source: singleWallet } : {}) })}`,
                                    name: "Transfer money",
                                    icon: ArrowLeftRight,
                                },
                                {
                                    href: `${base}/import`,
                                    name: "Import CSV",
                                    icon: Upload,
                                },
                                {
                                    href: `/dashboard/accounts/${accountId}/recurring`,
                                    name: "Recurring transactions",
                                    icon: Repeat2,
                                },
                            ].map(({ href, name, icon: Icon }) => (
                                <DropdownMenuItem
                                    key={href}
                                    render={<Link href={href} />}
                                >
                                    <Icon />
                                    {name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {(active > 0 || filters.q) && (
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                        Filtered results
                        {filters.wallet
                            ? ` · ${selectedWallets.length === 1 ? (wallets.find((wallet) => wallet.id === singleWallet)?.name ?? "Selected wallet") : `${selectedWallets.length} wallets`}`
                            : ""}
                    </span>
                    <Link
                        href={`${base}?${new URLSearchParams(periodQuery(period))}`}
                        scroll={false}
                        className="font-medium text-primary"
                    >
                        Clear filters
                    </Link>
                </div>
            )}
            <Button
                nativeButton={false}
                render={
                    <Link
                        href={
                            wallets.length
                                ? `${base}/new?${new URLSearchParams({ returnTo, date: periodEntryDate(period, new Date().toISOString().slice(0, 10)), ...(singleWallet ? { wallet: singleWallet } : {}) })}`
                                : `/dashboard/accounts/${accountId}/wallets/new`
                        }
                    />
                }
                className="transaction-add-button h-11"
            >
                <Plus data-icon="inline-start" />
                {wallets.length ? "Add transaction" : "Add your first wallet"}
            </Button>
        </div>
    )
}
