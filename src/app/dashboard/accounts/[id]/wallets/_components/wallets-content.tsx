import Link from "next/link"
import { notFound } from "next/navigation"
import { getAccessibleFinancialAccount } from "@/lib/financial-accounts"
import { CachedWallets } from "@/components/workspace/cached-wallets"

export async function WalletsContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const account = await getAccessibleFinancialAccount(id)
    if (!account) notFound()
    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{account.name}</p>
                <Link
                    href="/dashboard/accounts"
                    className="text-sm underline underline-offset-4"
                >
                    All accounts
                </Link>
            </div>
            <CachedWallets accountId={id} />
        </>
    )
}
