import { randomUUID } from "node:crypto"
import { connection } from "next/server"
import { CachedTransferForm } from "@/components/workspace/cached-transfer-form"
export async function TransferContent({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ source?: string; returnTo?: string; date?: string }>
}) {
    const { id } = await params
    await connection()
    return (
        <CachedTransferForm
            accountId={id}
            query={await searchParams}
            requestId={randomUUID()}
        />
    )
}
