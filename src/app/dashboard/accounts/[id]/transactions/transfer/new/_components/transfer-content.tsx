import { validDay } from "@/lib/account-period"
import { transactionReturnPath } from "@/lib/transaction-return"
import { randomUUID } from "node:crypto"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { listOwnedTransferWallets } from "@/lib/transfers"
import { TransferForm } from "@/components/financial-accounts/transfer-form"
export async function TransferContent({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ source?: string; returnTo?: string; date?: string }>
}) {
    const { id } = await params
    const [account, wallets, query] = await Promise.all([
        getOwnedFinancialAccount(id),
        listOwnedTransferWallets(id),
        searchParams,
    ])
    if (!account) notFound()
    const returnTo = transactionReturnPath(query.returnTo, id)
    return (
        <>
            <Link
                href={returnTo}
                className="text-sm underline underline-offset-4"
            >
                Back to transactions
            </Link>
            {wallets.length < 2 ? (
                <p>Add another wallet before creating a transfer.</p>
            ) : (
                <TransferForm
                    returnTo={returnTo}
                    contextAccountId={id}
                    wallets={wallets}
                    requestId={randomUUID()}
                    today={
                        typeof query.date === "string" && validDay(query.date)
                            ? query.date
                            : new Date().toISOString().slice(0, 10)
                    }
                    sourceId={
                        typeof query.source === "string"
                            ? query.source
                            : undefined
                    }
                />
            )}
        </>
    )
}
