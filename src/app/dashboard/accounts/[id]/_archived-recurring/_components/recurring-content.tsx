import Link from "next/link"
import { notFound } from "next/navigation"
import { getAccessibleFinancialAccount } from "@/lib/financial-accounts"
import { listOwnedRecurring } from "@/lib/recurring"
import { formatWalletMoney } from "@/lib/wallet-input"
import {
    RecurringControls,
    SyncRecurringButton,
} from "@/components/financial-accounts/recurring-controls"
import { RecurringSync } from "@/components/financial-accounts/recurring-sync"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
export async function RecurringContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const [account, rules] = await Promise.all([
        getAccessibleFinancialAccount(id),
        listOwnedRecurring(id),
    ])
    if (!account) notFound()
    return (
        <>
            <RecurringSync accountId={id} />
            <Link
                href={`/dashboard/accounts/${id}`}
                className="text-sm underline underline-offset-4"
            >
                Back to {account.name}
            </Link>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <Link
                    href={`/dashboard/accounts/${id}/transactions/new`}
                    className="text-sm underline underline-offset-4"
                >
                    Add a repeating transaction
                </Link>
                <SyncRecurringButton accountId={id} />
            </div>
            {!rules.length && (
                <p className="rounded-lg border p-6 text-muted-foreground">
                    No recurring transactions yet. Add an expense or income and
                    enable Repeat.
                </p>
            )}
            {rules.map((rule) => {
                const upcoming = rule.upcoming.map((row) => row.date)
                const status = rule.stoppedAt
                    ? "Stopped"
                    : rule.pausedAt
                      ? "Paused"
                      : !rule.nextOccurrenceAt
                        ? "All instances created"
                        : "Active"
                return (
                    <Card key={rule.id}>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <CardTitle className="break-words">
                                    {rule.name}
                                </CardTitle>
                                <Badge variant="secondary">{status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <p className="font-medium tabular-nums">
                                {formatWalletMoney(
                                    rule.amount.toFixed(2),
                                    rule.source.wallet.currency
                                )}{" "}
                                ·{" "}
                                {rule.type === "TRANSFER"
                                    ? "Transfer"
                                    : rule.type === "EXPENSE"
                                      ? "Expense"
                                      : "Income"}
                            </p>
                            {rule.destination && (
                                <p className="text-sm text-muted-foreground">
                                    {rule.source.wallet.name} →{" "}
                                    {rule.destination.wallet.name} ·{" "}
                                    {formatWalletMoney(
                                        (
                                            rule.destinationAmount ??
                                            rule.amount
                                        ).toFixed(2),
                                        rule.destination.wallet.currency
                                    )}{" "}
                                    received (estimate)
                                </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                                Every {rule.interval}{" "}
                                {rule.frequency
                                    .toLowerCase()
                                    .replace("daily", "day")
                                    .replace("weekly", "week")
                                    .replace("monthly", "month")
                                    .replace("yearly", "year")}
                                {rule.interval > 1 ? "s" : ""} ·{" "}
                                {rule.source.wallet.name} · {rule.timezone}
                                <br />
                                Pending copies created upfront
                                {rule.endsAt
                                    ? ` · Ends ${rule.endsAt.toISOString().slice(0, 10)}`
                                    : rule.endAfter
                                      ? ` · ${rule.endAfter} scheduled occurrences total`
                                      : " · No end date"}
                            </p>
                            {upcoming.length > 0 && (
                                <div>
                                    <h2 className="text-sm font-medium">
                                        Upcoming dates
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {upcoming.join(" · ")}
                                    </p>
                                </div>
                            )}
                            {rule.occurrences[0]?.transactionId && (
                                <Link
                                    href={`/dashboard/accounts/${id}/transactions/${rule.occurrences[0].transactionId}/edit`}
                                    className="text-sm underline underline-offset-4"
                                >
                                    Edit an occurrence or the series
                                </Link>
                            )}
                            <RecurringControls
                                accountId={id}
                                ruleId={rule.id}
                                version={rule.version}
                                paused={Boolean(rule.pausedAt)}
                                stopped={Boolean(rule.stoppedAt)}
                                hasNext={Boolean(
                                    rule.upcoming.length ||
                                    rule.nextOccurrenceAt
                                )}
                            />
                        </CardContent>
                    </Card>
                )
            })}
        </>
    )
}
