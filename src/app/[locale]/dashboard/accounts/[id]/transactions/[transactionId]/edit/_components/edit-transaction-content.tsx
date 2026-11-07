import { getTranslations } from "@/lib/i18n/server"
import { transactionReturnPath } from "@/lib/transaction-return"
import {
    isTransferReference,
    getOwnedEditableTransfer,
    listOwnedTransferWallets,
} from "@/lib/transfers"
import { TransferForm } from "@/components/financial-accounts/transfer-form"
import { randomUUID } from "node:crypto"
import Link from "@/components/i18n/link"
import { notFound } from "next/navigation"
import { getOwnedEditableTransaction } from "@/lib/transactions"
import { listOwnedAccountWallets } from "@/lib/wallets"
import { listOwnedAccountCategories } from "@/lib/categories"
import { CreateTransactionForm } from "@/components/financial-accounts/create-transaction-form"
export async function EditTransactionContent({
    params,
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
    params: Promise<{ id: string; transactionId: string }>
}) {
    const t = await getTranslations()

    const query = await searchParams
    const { id, transactionId } = await params
    const returnTo = transactionReturnPath(query.returnTo, id)
    if (await isTransferReference(id, transactionId)) {
        const [transfer, options] = await Promise.all([
            getOwnedEditableTransfer(id, transactionId),
            listOwnedTransferWallets(id),
        ])
        if (!transfer) notFound()
        return (
            <>
                <Link
                    href={returnTo}
                    className="text-sm underline underline-offset-4"
                >
                    {t("Back to transactions")}
                </Link>
                <TransferForm
                    returnTo={returnTo}
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
                href={returnTo}
                className="text-sm underline underline-offset-4"
            >
                {t("Back to transactions")}
            </Link>
            <CreateTransactionForm
                returnTo={returnTo}
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
