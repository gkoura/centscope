import { randomUUID } from "node:crypto"
import Link from "next/link"
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
    const { id } = await params
    const account = await getOwnedFinancialAccount(id)
    if (!account) notFound()
    return (
        <>
            <Link
                href={`/dashboard/accounts/${account.id}`}
                className="text-sm underline underline-offset-4"
            >
                Back to account
            </Link>
            <Card>
                <CardHeader>
                    <CardDescription>
                        <span className="break-words">
                            Create a wallet for {account.name} and set its
                            starting balance.
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
