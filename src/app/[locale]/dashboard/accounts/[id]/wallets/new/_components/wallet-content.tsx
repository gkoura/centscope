import { getTranslations } from "@/lib/i18n/server"
import { randomUUID } from "node:crypto"
import Link from "@/components/i18n/link"
import { notFound } from "next/navigation"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { CreateWalletForm } from "@/components/financial-accounts/create-wallet-form"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from "@/components/ui/card"

export async function WalletContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const t = await getTranslations()

    const { id } = await params
    const account = await getOwnedFinancialAccount(id)
    if (!account) notFound()
    return (
        <>
            <Link
                href={`/dashboard/accounts/${account.id}`}
                className="text-sm underline underline-offset-4"
            >
                {t("Back to account")}
            </Link>
            <Card>
                <CardHeader>
                    <CardDescription>
                        <span className="break-words">
                            {t("Create a wallet for")} {account.name}{" "}
                            {t("and set its starting balance.")}
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CreateWalletForm
                        financialAccountId={account.id}
                        requestId={randomUUID()}
                        defaultCurrency={account.reportingCurrency}
                        today={new Date().toISOString().slice(0, 10)}
                    />
                </CardContent>
            </Card>
        </>
    )
}
