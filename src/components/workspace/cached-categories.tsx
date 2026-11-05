"use client"
import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CategoryManager } from "@/components/financial-accounts/category-manager"

export function CachedCategories({ accountId }: { accountId: string }) {
    const result = useWorkspaceQuery("reference", accountId)
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label="Loading categories…"
            />
        )
    const { account, categories } = result.data
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
