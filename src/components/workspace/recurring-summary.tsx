import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Link from "next/link"
import {
    ArrowUpRight,
    ArrowDownLeft,
    ArrowLeftRight,
    Repeat2,
} from "lucide-react"
import { formatWalletMoney } from "@/lib/wallet-input"
import {
    recurringSummaryDescription,
    type RecurringSummaryItem,
} from "@/lib/recurring-summary"

export function RecurringSummary({
    accountId,
    rules,
}: {
    accountId: string
    rules: RecurringSummaryItem[]
}) {
    const href = `/dashboard/accounts/${accountId}/recurring`
    return (
        <Card
            role="region"
            aria-labelledby="recurring-summary-heading"
            className="gap-0 py-0"
        >
            <CardHeader className="gap-0 px-0">
                <CardTitle>
                    <h2 id="recurring-summary-heading">
                        <Link
                            href={href}
                            className="flex min-h-14 items-center gap-3 px-5 py-4 text-base font-semibold tracking-tight hover:bg-muted focus-visible:outline-offset-[-3px]"
                        >
                            <Repeat2
                                className="size-4 shrink-0 text-primary"
                                aria-hidden="true"
                            />
                            Recurring transactions
                            <ArrowUpRight
                                className="ml-auto size-4 shrink-0 text-muted-foreground"
                                aria-hidden="true"
                            />
                        </Link>
                    </h2>
                </CardTitle>
            </CardHeader>
            <CardContent className="border-t px-0">
                {rules.length ? (
                    <ul className="divide-y">
                        {rules.map((rule) => {
                            const flow =
                                rule.type === "INCOME"
                                    ? "income"
                                    : rule.type === "EXPENSE"
                                      ? "expense"
                                      : undefined
                            const Icon =
                                rule.type === "INCOME"
                                    ? ArrowDownLeft
                                    : rule.type === "EXPENSE"
                                      ? ArrowUpRight
                                      : ArrowLeftRight
                            return (
                                <li
                                    key={rule.id}
                                    className="flex items-center gap-3 px-5 py-4"
                                >
                                    <span
                                        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted"
                                        aria-hidden="true"
                                    >
                                        <Icon
                                            className="size-4"
                                            data-flow={flow}
                                        />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium wrap-break-word">
                                            {rule.name}
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                            {recurringSummaryDescription(rule)}
                                        </p>
                                    </div>
                                    <p
                                        className="max-w-[45%] text-right text-sm font-semibold [overflow-wrap:anywhere] tabular-nums"
                                        data-flow={flow}
                                    >
                                        {rule.type === "INCOME"
                                            ? "+"
                                            : rule.type === "EXPENSE"
                                              ? "−"
                                              : ""}
                                        {formatWalletMoney(
                                            rule.amount,
                                            rule.currency
                                        )}
                                    </p>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <p className="px-5 py-4 text-sm leading-6 text-muted-foreground">
                        No recurring transactions to show. Enable Repeat when
                        adding a transaction.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
