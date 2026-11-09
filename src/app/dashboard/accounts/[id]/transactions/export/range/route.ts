import { getAccessibleFinancialAccount } from "@/lib/financial-accounts"
import { getOwnedAccountTransactionRange } from "@/lib/transactions"

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const account = await getAccessibleFinancialAccount(id)
    const headers = { "Cache-Control": "private, no-store" }
    if (!account)
        return Response.json(
            { message: "Account not found" },
            { status: 404, headers }
        )
    return Response.json(
        { range: await getOwnedAccountTransactionRange(id) },
        { headers }
    )
}
