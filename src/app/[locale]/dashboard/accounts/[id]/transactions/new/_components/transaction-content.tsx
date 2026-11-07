import { randomUUID } from "node:crypto"
import { connection } from "next/server"
import { CachedTransactionForm } from "@/components/workspace/cached-transaction-form"
export async function TransactionContent({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { id } = await params
    const query = await searchParams
    // Submission identities must be generated for a real request, never a prerender.
    await connection()
    return (
        <CachedTransactionForm
            accountId={id}
            query={query}
            requestId={randomUUID()}
        />
    )
}
