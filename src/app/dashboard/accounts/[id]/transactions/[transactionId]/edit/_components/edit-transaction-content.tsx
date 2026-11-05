import {
    isTransferReference,
    getOwnedEditableTransfer,
    listOwnedTransferWallets,
} from "@/lib/transfers"
import { TransferForm } from "@/components/financial-accounts/transfer-form"
import { randomUUID } from "node:crypto"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getOwnedEditableTransaction } from "@/lib/transactions"
import { listOwnedAccountWallets } from "@/lib/wallets"
import { listOwnedAccountCategories } from "@/lib/categories"
import { CreateTransactionForm } from "@/components/financial-accounts/create-transaction-form"
export async function EditTransactionContent({
    params,
}: {
    params: Promise<{ id: string; transactionId: string }>
}) {
    const { id, transactionId } = await params
    if (await isTransferReference(id, transactionId)) {
        const [transfer, options] = await Promise.all([
            getOwnedEditableTransfer(id, transactionId),
            listOwnedTransferWallets(id),
        ])
        if (!transfer) notFound()
        return (
            <>
                <Link
                    href={`/dashboard/accounts/${id}/transactions`}
                    className="text-sm underline underline-offset-4"
                >
                    Back to transactions
                </Link>
                <TransferForm
                    contextAccountId={id}
                    wallets={options}
                    requestId={randomUUID()}
                    today={transfer.date}
                    editing={transfer}
                />
            </>
        )
    }
    const [transaction, wallets, categories] = await Promise.all([
        getOwnedEditableTransaction(id, transactionId),
        listOwnedAccountWallets(id),
        listOwnedAccountCategories(id),
    ])
    if (!transaction) notFound()
    const currency = wallets.find(
        (wallet) => wallet.id === transaction.accountWalletId
    )?.currency
    return (
        <>
            <Link
                href={`/dashboard/accounts/${id}/transactions`}
                className="text-sm underline underline-offset-4"
            >
                Back to transactions
            </Link>
            <CreateTransactionForm
                financialAccountId={id}
                requestId={randomUUID()}
                today={transaction.date}
                wallets={wallets
                    .filter((wallet) => wallet.currency === currency)
                    .map(({ id, name, currency }) => ({ id, name, currency }))}
                categories={categories}
                suggestions={[]}
                editing={transaction}
            />
        </>
    )
}
