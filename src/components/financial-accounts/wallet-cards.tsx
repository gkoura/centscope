"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"

import { useTranslations } from "@/components/i18n/locale-provider"

import { currencySymbol } from "@/lib/currency"
import Link from "@/components/i18n/link"
import { Button } from "@/components/ui/button"
import { WalletDeleteDialog } from "./wallet-delete-dialog"
import { WalletEditDialog } from "./wallet-edit-dialog"
import type { listOwnedAccountWallets } from "@/lib/wallets"
import { formatWalletMoney, walletTypes } from "@/lib/wallet-input"
import { saveWalletOrder } from "@/app/[locale]/dashboard/order-actions"
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
    const locale = useLocale()

    const t = useTranslations()

    return (
        <ReorderableList
            items={wallets}
            label={t("wallets")}
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
                            {t(
                                walletTypes.find(
                                    (option) => option.value === wallet.type
                                )?.label || wallet.type
                            )}{" "}
                            · {currencySymbol(wallet.currency)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <p className="text-sm text-muted-foreground">
                                {t("Posted balance")}
                            </p>
                            <p className="text-xl font-semibold wrap-break-word tabular-nums">
                                {formatWalletMoney(
                                    wallet.balance,
                                    wallet.currency,
                                    intlLocale(locale)
                                )}
                            </p>
                        </div>
                        {wallet.opening ? (
                            <div className="flex flex-col items-start gap-2">
                                <Badge variant="secondary">
                                    {wallet.opening.status === "POSTED"
                                        ? t("Posted")
                                        : t("Pending")}{" "}
                                    {t("opening balance")}
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    {formatWalletMoney(
                                        wallet.opening.amount,
                                        wallet.currency,
                                        intlLocale(locale)
                                    )}{" "}
                                    · {wallet.opening.date}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t("Started at zero.")}
                            </p>
                        )}
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={disabled}
                                render={
                                    <Link
                                        href={`/dashboard/accounts/${financialAccountId}/transactions/transfer/new?source=${wallet.id}`}
                                    />
                                }
                                nativeButton={false}
                            >
                                {t("Transfer")}
                            </Button>
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
