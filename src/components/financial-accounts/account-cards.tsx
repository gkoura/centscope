"use client"

import type { listOwnedFinancialAccounts } from "@/lib/financial-accounts"
import { saveAccountOrder } from "@/app/dashboard/order-actions"
import { ReorderableList } from "@/components/sortable/reorderable-list"
import { SortableHandle } from "@/components/sortable/sortable-item"
import { Badge } from "@/components/ui/badge"
import { AccountCard } from "./account-card"

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
                <AccountCard
                    account={account}
                    isOwner
                    handle={<SortableHandle />}
                    status={
                        <Badge variant="secondary">
                            {account.id === accounts[0]?.id
                                ? "Default account"
                                : "Owner"}
                        </Badge>
                    }
                />
            )}
        />
    )
}
