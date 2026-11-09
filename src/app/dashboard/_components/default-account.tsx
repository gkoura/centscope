import { listSharedAccounts } from "@/lib/account-sharing"
import { redirect } from "next/navigation"
import { listOwnedFinancialAccounts } from "@/lib/financial-accounts"
export async function DefaultAccount({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const query = await searchParams
    const accounts = await listOwnedFinancialAccounts()
    const id =
        accounts[0]?.id ?? (await listSharedAccounts())[0]?.financialAccount.id
    const section =
        query.section === "transactions"
            ? "/transactions"
            : query.section === "analytics"
              ? "/analytics"
              : ""
    return redirect(
        id ? `/dashboard/accounts/${id}${section}` : "/dashboard/accounts"
    )
}
