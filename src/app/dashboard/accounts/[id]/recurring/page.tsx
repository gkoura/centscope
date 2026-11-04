import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import { RecurringContent } from "./_components/recurring-content"
export default function RecurringPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    return (
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 sm:p-10">
            <h1 className="text-2xl font-semibold">Recurring transactions</h1>
            <p className="text-sm text-muted-foreground">
                Create repeating expenses and income upfront as Pending. Mark
                each payment Posted when it happens. Open-ended schedules keep
                the next 12 months ready.
            </p>
            <Suspense
                fallback={
                    <SectionLoading label="Loading recurring schedules…" />
                }
            >
                <RecurringContent params={params} />
            </Suspense>
        </main>
    )
}
