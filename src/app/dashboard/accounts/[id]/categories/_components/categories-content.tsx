import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { listOwnedAccountCategories } from "@/lib/categories"
import { CategoryManager } from "@/components/financial-accounts/category-manager"

export async function CategoriesContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const account = await getOwnedFinancialAccount(id)
    if (!account) notFound()
    const categories = await listOwnedAccountCategories(account.id)
    return (
        <>
            <Link
                href={`/dashboard/accounts/${account.id}`}
                className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-4" />
                Back to account
            </Link>
            <div>
                <p className="mb-2 text-xs font-medium wrap-break-word text-primary">
                    {account.name}
                </p>
            </div>
            <CategoryManager
                financialAccountId={account.id}
                categories={categories}
            />
        </>
    )
}
