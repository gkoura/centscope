"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"

import { useTranslations } from "@/components/i18n/locale-provider"

import { SyncRecurringButton } from "@/components/financial-accounts/recurring-controls"
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
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
    const locale = useLocale()

    const t = useTranslations()

    return (
        <Card
            role="region"
            aria-labelledby="recurring-summary-heading"
            className="gap-0 py-0"
        >
            <CardHeader className="gap-0 px-0">
                <CardTitle>
                    <h2 id="recurring-summary-heading">
                        <span className="flex min-h-14 items-center gap-3 px-5 py-4">
                            <Repeat2
                                className="size-4 shrink-0 text-primary"
                                aria-hidden="true"
                            />
                            {t("Recurring transactions")}
                        </span>
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
                                            {recurringSummaryDescription(
                                                rule,
                                                t
                                            )}
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
                                            rule.currency,
                                            intlLocale(locale)
                                        )}
                                    </p>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <p className="px-5 py-4 text-sm leading-6 text-muted-foreground">
                        {t(
                            "No recurring transactions to show. Enable Repeat when adding a transaction."
                        )}
                    </p>
                )}
            </CardContent>
            <CardFooter className="justify-end px-5 py-4">
                <SyncRecurringButton accountId={accountId} />
            </CardFooter>
        </Card>
    )
}
