import { Skeleton } from "@/components/ui/skeleton"
export function RouteLoading() {
    return (
        <div
            role="status"
            className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-10"
        >
            <span className="sr-only">Loading your workspace…</span>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 max-w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
    )
}
