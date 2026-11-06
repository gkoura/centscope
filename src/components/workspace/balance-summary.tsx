import { WalletBalanceTiles } from "./wallet-balance-tiles"
import { balanceTotals } from "@/lib/account-summary"
import { formatWalletMoney } from "@/lib/wallet-input"
import type { listOwnedAccountWallets } from "@/lib/wallets"

export function BalanceSummary({
    wallets,
    accountId,
    periodQuery,
    compact = false,
    selectedWalletId,
}: {
    wallets: Awaited<ReturnType<typeof listOwnedAccountWallets>>
    accountId: string
    periodQuery: Record<string, string>
    selectedWalletId?: string
    compact?: boolean
}) {
    const totals = balanceTotals(wallets)
    return (
        <section
            aria-label="Account and wallet balances"
            className={
                compact
                    ? "balance-summary-compact flex min-w-0 flex-col gap-3"
                    : "flex min-w-0 flex-col gap-4"
            }
        >
            <div className="balance-hero">
                <p className="text-xs font-medium tracking-wider uppercase">
                    Total balance
                </p>
                {totals.length ? (
                    totals.map((total) => (
                        <p key={total.currency} className="balance-value">
                            {formatWalletMoney(total.amount, total.currency)}
                        </p>
                    ))
                ) : (
                    <p className="balance-value">No wallets yet</p>
                )}
                <p className="mt-3 text-xs opacity-75">
                    Current posted balance
                    {totals.length > 1 ? " · currencies shown separately" : ""}
                </p>
                {!compact && wallets.length > 0 && (
                    <dl
                        className="balance-wallet-split"
                        aria-label="Balance by wallet"
                    >
                        {wallets.map((wallet) => (
                            <div key={wallet.id} className="min-w-0">
                                <dt className="min-w-0 text-xs [overflow-wrap:anywhere] opacity-80">
                                    {wallet.name}
                                </dt>
                                <dd className="mt-1 text-base font-medium [overflow-wrap:anywhere] tabular-nums">
                                    {formatWalletMoney(
                                        wallet.balance,
                                        wallet.currency
                                    )}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
            {compact && wallets.length > 0 && (
                <WalletBalanceTiles
                    wallets={wallets.map(({ id, name, currency, balance }) => ({
                        id,
                        name,
                        currency,
                        balance,
                    }))}
                    accountId={accountId}
                    periodQuery={periodQuery}
                    filterable={compact}
                    selectedWallets={selectedWalletId}
                />
            )}
        </section>
    )
}
