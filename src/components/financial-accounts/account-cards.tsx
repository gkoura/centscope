"use client"
import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"
import type { listOwnedFinancialAccounts } from "@/lib/financial-accounts"
import { saveAccountOrder } from "@/app/dashboard/order-actions"
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
    return (
        <ReorderableList
            items={accounts}
            label="accounts"
            onSave={saveAccountOrder}
            renderItem={(account) => (
                <Card className="account-card-link relative h-full">
                    <Link
                        href={`/dashboard/accounts/${account.id}`}
                        aria-label={`Open ${account.name}`}
                        className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    />
                    <CardHeader className="pointer-events-none">
                        <CardTitle>
                            <h2 className="wrap-break-word">{account.name}</h2>
                        </CardTitle>
                        <CardDescription>
                            Reporting currency: {account.reportingCurrency}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pointer-events-none relative flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <SortableHandle />
                            <Badge variant="secondary">Owner</Badge>
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
