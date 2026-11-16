import { randomUUID } from "node:crypto"
import Link from "next/link"
import { notFound } from "next/navigation"
import { validDay } from "@/lib/account-period"
import { workspaceAccount } from "@/lib/account-workspace"
import { transactionReturnPath } from "@/lib/transaction-return"
import {
    transactionCopy,
    transferCopy,
    validCopyIntent,
} from "@/lib/transaction-duplicate"
import { getOwnedEditableTransaction } from "@/lib/transactions"
import {
    getOwnedEditableTransfer,
    isTransferReference,
    listOwnedTransferWallets,
} from "@/lib/transfers"
import { listOwnedAccountWallets } from "@/lib/wallets"
import { listOwnedAccountCategories } from "@/lib/categories"
import { CreateTransactionForm } from "@/components/financial-accounts/create-transaction-form"
import { TransferForm } from "@/components/financial-accounts/transfer-form"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"

export async function DuplicateTransactionContent({
    params,
    searchParams,
}: {
    params: Promise<{ id: string; transactionId: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { id, transactionId } = await params
    const query = await searchParams
    await workspaceAccount(id)
    const date = query.date ?? new Date().toISOString().slice(0, 10)
    if (typeof date !== "string" || !validDay(date)) notFound()
    if (query.copy !== undefined && !validCopyIntent(query.copy)) notFound()
    const requestId = query.copy ?? randomUUID()
    const returnTo = transactionReturnPath(query.returnTo, id)
    let form: React.ReactNode
    let name: string
    let originalDate: string
    let monthCount: number | undefined
    if (await isTransferReference(id, transactionId)) {
        const [source, wallets] = await Promise.all([
            getOwnedEditableTransfer(id, transactionId),
            listOwnedTransferWallets(id),
        ])
        if (!source) notFound()
        name = source.name
        originalDate = source.date
        form = (
            <TransferForm
                returnTo={returnTo}
                contextAccountId={id}
                wallets={wallets}
                requestId={requestId}
                today={date}
                initialValues={transferCopy(source, date)}
            />
        )
    } else {
        const [source, wallets, categories] = await Promise.all([
            getOwnedEditableTransaction(id, transactionId),
            listOwnedAccountWallets(id),
            listOwnedAccountCategories(id),
        ])
        if (!source) notFound()
        name = source.name
        originalDate = source.date
        monthCount = source.spread?.monthCount
        form = (
            <CreateTransactionForm
                returnTo={returnTo}
                financialAccountId={id}
                wallets={wallets.map(({ id, name, currency }) => ({
                    id,
                    name,
                    currency,
                }))}
                categories={categories}
                suggestions={[]}
                requestId={requestId}
                today={date}
                initialValues={transactionCopy(source, date)}
            />
        )
    }
    return (
        <>
            <Link
                href={returnTo}
                className="text-sm underline underline-offset-4"
            >
                Back to transactions
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle className="min-w-0 [overflow-wrap:anywhere] break-words">
                        Copy of {name}
                    </CardTitle>
                    <CardDescription>
                        Original date: {originalDate}. Repeat starts off.
                        {monthCount
                            ? ` Expense spreading keeps ${monthCount} months and starts in ${date.slice(0, 7)}; you can adjust it below.`
                            : ""}
                    </CardDescription>
                </CardHeader>
                <CardContent>{form}</CardContent>
            </Card>
        </>
    )
}
