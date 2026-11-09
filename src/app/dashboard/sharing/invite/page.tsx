import { Suspense } from "react"
import { Invitation } from "./_components/invitation"
export default function Page({
    searchParams,
}: {
    searchParams: Promise<{ token?: string; unavailable?: string }>
}) {
    return (
        <main className="mx-auto grid max-w-xl gap-5 p-8">
            <h1 className="text-2xl font-semibold">Account invitation</h1>
            <Suspense fallback={<p>Loading invitation…</p>}>
                <Invitation query={searchParams} />
            </Suspense>
        </main>
    )
}
