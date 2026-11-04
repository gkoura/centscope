"use client"
import { WalletDeleteDialog } from "./wallet-delete-dialog"
import { WalletEditDialog } from "./wallet-edit-dialog"
import type { listOwnedAccountWallets } from "@/lib/wallets"
import { formatWalletMoney, walletTypes } from "@/lib/wallet-input"
import { saveWalletOrder } from "@/app/dashboard/order-actions"
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

export function WalletCards({
    financialAccountId,
    wallets,
    today,
}: {
    financialAccountId: string
    today: string
    wallets: Awaited<ReturnType<typeof listOwnedAccountWallets>>
}) {
    return (
        <ReorderableList
            items={wallets}
            label="wallets"
            onSave={(input) => saveWalletOrder(financialAccountId, input)}
            renderItem={(wallet, { disabled }) => (
                <Card className="h-full">
                    <CardHeader className="relative pr-14">
                        <div className="absolute top-0 right-3">
                            <SortableHandle />
                        </div>
                        <CardTitle>
                            <h3 className="wrap-break-word">{wallet.name}</h3>
                        </CardTitle>
                        <CardDescription>
                            {
                                walletTypes.find(
                                    (option) => option.value === wallet.type
                                )?.label
                            }{" "}
                            · {wallet.currency}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <p className="text-sm text-muted-foreground">
                                Posted balance
                            </p>
                            <p className="text-xl font-semibold wrap-break-word tabular-nums">
                                {formatWalletMoney(
                                    wallet.balance,
                                    wallet.currency
                                )}
                            </p>
                        </div>
                        {wallet.opening ? (
                            <div className="flex flex-col items-start gap-2">
                                <Badge variant="secondary">
                                    {wallet.opening.status === "POSTED"
                                        ? "Posted"
                                        : "Pending"}{" "}
                                    opening balance
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    {formatWalletMoney(
                                        wallet.opening.amount,
                                        wallet.currency
                                    )}{" "}
                                    · {wallet.opening.date}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Started at zero.
                            </p>
                        )}
                        <div className="flex flex-wrap justify-end gap-2">
                            <WalletEditDialog
                                key={`${wallet.id}-${wallet.updatedAt}`}
                                financialAccountId={financialAccountId}
                                wallet={wallet}
                                today={today}
                                disabled={disabled}
                            />
                            <WalletDeleteDialog
                                key={`delete-${wallet.id}-${wallet.updatedAt}`}
                                financialAccountId={financialAccountId}
                                wallet={wallet}
                                disabled={disabled}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        />
    )
}
