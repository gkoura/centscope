"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { currencySymbol } from "@/lib/currency"
import Link from "@/components/i18n/link"
import { ArrowUpRightIcon } from "lucide-react"
import type { listOwnedFinancialAccounts } from "@/lib/financial-accounts"
import { saveAccountOrder } from "@/app/[locale]/dashboard/order-actions"
import { ReorderableList } from "@/components/sortable/reorderable-list"
import { SortableHandle } from "@/components/sortable/sortable-item"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"

export function AccountCards({
    accounts,
}: {
    accounts: Awaited<ReturnType<typeof listOwnedFinancialAccounts>>
}) {
    const t = useTranslations()

    return (
        <ReorderableList
            items={accounts}
            label={t("accounts")}
            onSave={saveAccountOrder}
            renderItem={(account) => (
                <Card className="account-card-link relative h-full">
                    <Link
                        href={`/dashboard/accounts/${account.id}`}
                        aria-label={t("Open {value0}", {
                            value0: account.name,
                        })}
                        className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    />
                    <CardHeader className="pointer-events-none">
                        <CardTitle>
                            <h2 className="wrap-break-word">{account.name}</h2>
                        </CardTitle>
                        <CardDescription>
                            {t("Reporting currency:")}{" "}
                            {currencySymbol(account.reportingCurrency)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pointer-events-none relative flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <SortableHandle />
                            <Badge variant="secondary">
                                {account.id === accounts[0]?.id
                                    ? t("Default account")
                                    : t("Owner")}
                            </Badge>
                        </div>
                        <ArrowUpRightIcon
                            className="account-card-arrow size-4 text-muted-foreground"
                            aria-hidden="true"
                        />
                    </CardContent>
                </Card>
            )}
        />
    )
}
