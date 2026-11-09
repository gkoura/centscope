import { GET as exportTransactions } from "@/app/dashboard/accounts/[id]/transactions/export/route"
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const url = new URL(request.url)
    url.searchParams.set("period", "all")
    return exportTransactions(
        new Request(url, { headers: request.headers }),
        context
    )
}
