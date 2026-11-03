import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { listOwnedAccountCategories } from "@/lib/categories"
import { CategoryManager } from "@/components/financial-accounts/category-manager"

export default async function CategoriesPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const account = await getOwnedFinancialAccount(id)
    if (!account) notFound()
    const categories = await listOwnedAccountCategories(account.id)
    return (
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-7 p-6 sm:p-10">
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
                <h1 className="text-3xl font-semibold tracking-tight">
                    Categories
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                    A little structure for everyday life. Organize your expenses
                    and income in a way that feels natural to you.
                </p>
            </div>
            <CategoryManager
                financialAccountId={account.id}
                categories={categories}
            />
        </main>
    )
}
