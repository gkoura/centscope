import { Suspense } from "react"
import { SharingContent } from "./_components/sharing-content"
export default function Page({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ page?: string; error?: string }>
}) {
    return (
        <main className="mx-auto grid w-full max-w-4xl gap-6 p-6 md:p-10">
            <h1 className="text-2xl font-semibold">Account sharing</h1>
            <Suspense fallback={<p>Loading account access…</p>}>
                <SharingContent params={params} query={searchParams} />
            </Suspense>
        </main>
    )
}
