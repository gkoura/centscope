import { getAccessibleFinancialAccount } from "@/lib/financial-accounts"
import { listOwnedAccountTransactions } from "@/lib/transactions"
import {
    parseTransactionFilters,
    type TransactionQuery,
} from "@/lib/transaction-filters"
import { exportRangeError } from "@/lib/transaction-export-period"
import { transactionsCsv } from "@/lib/transaction-export"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const account = await getAccessibleFinancialAccount(id)
    if (!account)
        return new Response("Account not found", {
            status: 404,
            headers: { "Cache-Control": "private, no-store" },
        })
    const search = new URL(request.url).searchParams
    const query: TransactionQuery = Object.fromEntries(search)
    query.wallet = search.getAll("wallet")
    query.category = search.getAll("category")
    const range = { from: search.get("from") ?? "", to: search.get("to") ?? "" }
    const allTime = search.get("period") === "all"
    const error = allTime ? null : exportRangeError(range)
    if (error)
        return new Response(error, {
            status: 400,
            headers: { "Cache-Control": "private, no-store" },
        })
    const filters = {
        ...parseTransactionFilters(query),
        from: allTime ? undefined : range.from,
        to: allTime ? undefined : range.to,
    }
    // A single Repeatable Read query exports a consistent snapshot across all pages.
    // Navigation cursors are deliberately ignored.
    const { transactions } = await listOwnedAccountTransactions(
        id,
        undefined,
        filters,
        { unpaginated: true }
    )
    return new Response(transactionsCsv(transactions), {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="centscope-transactions-${allTime ? "all-time" : `${range.from}-${range.to}`}.csv"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    })
}
