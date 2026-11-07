"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"

import { useTranslations } from "@/components/i18n/locale-provider"

import Link from "@/components/i18n/link"
import { useOptimistic, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/components/i18n/navigation"
import { Wallet, ArrowUpRight, Check } from "lucide-react"
import { formatWalletMoney } from "@/lib/wallet-input"
import { toggleWalletFilter, walletFilterIds } from "@/lib/transaction-filters"
import { Button } from "@/components/ui/button"

type WalletBalance = {
    id: string
    name: string
    currency: string
    balance: string
}
export function WalletBalanceTiles({
    wallets,
    accountId,
    periodQuery,
    filterable = false,
    selectedWallets = "",
}: {
    wallets: WalletBalance[]
    accountId: string
    periodQuery: Record<string, string>
    filterable?: boolean
    selectedWallets?: string
}) {
    const locale = useLocale()

    const t = useTranslations()

    const router = useRouter(),
        query = useSearchParams()
    const [optimistic, setOptimistic] = useOptimistic(
        selectedWallets,
        (_previous: string, next: string) => next
    )
    const [pending, startTransition] = useTransition()
    const selected = walletFilterIds(optimistic)
    function apply(value: string) {
        const next = new URLSearchParams(query)
        next.delete("wallet")
        next.delete("before")
        next.delete("after")
        if (value) next.set("wallet", value)
        startTransition(() => {
            setOptimistic(value)
            router.push(
                `/dashboard/accounts/${accountId}/transactions?${next}`,
                { scroll: false }
            )
        })
    }
    return (
        <div className="min-w-0">
            {filterable && (
                <div className="mb-2 flex min-h-8 items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span aria-live="polite">
                        {selected.length
                            ? t(
                                  selected.length === 1
                                      ? "{count} wallet selected"
                                      : "{count} wallets selected",
                                  { count: selected.length }
                              )
                            : t("All wallets · tap to filter")}
                        {pending ? t(" · Updating…") : ""}
                    </span>
                    {selected.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => apply("")}
                        >
                            {t("All wallets")}
                        </Button>
                    )}
                </div>
            )}
            <ul
                className="wallet-balance-strip"
                aria-label={
                    filterable ? t("Filter by wallets") : t("Wallet balances")
                }
            >
                {wallets.map((wallet) => {
                    const active = selected.includes(wallet.id)
                    const content = (
                        <>
                            <div className="flex items-center justify-between gap-4">
                                <Wallet
                                    className="size-4 text-primary"
                                    aria-hidden="true"
                                />
                                {filterable && active ? (
                                    <Check
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <ArrowUpRight
                                        className="size-3.5 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                )}
                            </div>
                            <span className="mt-3 block truncate text-xs text-muted-foreground">
                                {wallet.name}
                            </span>
                            <strong className="mt-1 block text-base font-medium tabular-nums">
                                {formatWalletMoney(
                                    wallet.balance,
                                    wallet.currency,
                                    intlLocale(locale)
                                )}
                            </strong>
                        </>
                    )
                    return (
                        <li key={wallet.id} className="min-w-0 shrink-0">
                            {filterable ? (
                                <button
                                    type="button"
                                    className="wallet-balance-tile text-left"
                                    aria-pressed={active}
                                    aria-label={t("Filter {value0}", {
                                        value0: wallet.name,
                                    })}
                                    onClick={() =>
                                        apply(
                                            toggleWalletFilter(
                                                optimistic,
                                                wallet.id
                                            )
                                        )
                                    }
                                >
                                    {content}
                                </button>
                            ) : (
                                <Link
                                    className="wallet-balance-tile"
                                    href={`/dashboard/accounts/${accountId}/transactions?${new URLSearchParams({ ...periodQuery, wallet: wallet.id })}`}
                                >
                                    {content}
                                </Link>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
