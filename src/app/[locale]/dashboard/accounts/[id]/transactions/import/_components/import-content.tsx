import { getTranslations } from "@/lib/i18n/server"
import Link from "@/components/i18n/link"
import { notFound } from "next/navigation"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { listOwnedAccountWallets } from "@/lib/wallets"
import { listOwnedAccountCategories } from "@/lib/categories"
import { TransactionImport } from "@/components/financial-accounts/transaction-import"

export async function ImportContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const t = await getTranslations()

    const { id } = await params
    const account = await getOwnedFinancialAccount(id)
    if (!account) notFound()
    const [wallets, categories] = await Promise.all([
        listOwnedAccountWallets(id),
        listOwnedAccountCategories(id),
    ])
    return (
        <>
            <Link
                href={`/dashboard/accounts/${id}/transactions`}
                className="text-sm underline underline-offset-4"
            >
                {t("Back to transactions")}
            </Link>
            <TransactionImport
                financialAccountId={id}
                wallets={wallets.map(({ id, name, currency }) => ({
                    id,
                    name,
                    currency,
                }))}
                categories={categories}
            />
        </>
    )
}
