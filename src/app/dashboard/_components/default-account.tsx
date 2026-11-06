import { redirect } from "next/navigation"
import { listOwnedFinancialAccounts } from "@/lib/financial-accounts"
export async function DefaultAccount({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const query = await searchParams
    const accounts = await listOwnedFinancialAccounts()
    return redirect(
        accounts.length
            ? `/dashboard/accounts/${accounts[0].id}${query.section === "transactions" ? "/transactions" : query.section === "analytics" ? "/analytics" : ""}`
            : "/dashboard/accounts"
    )
}
