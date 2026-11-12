import {
    CachedAnalyticsControls,
    CachedAnalyticsActivity,
    CachedAnalyticsCategories,
} from "@/components/workspace/cached-analytics"
import type { TransactionQuery } from "@/lib/transaction-filters"
type Props = {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}
export async function AnalyticsControls({ params, searchParams }: Props) {
    return (
        <CachedAnalyticsControls
            accountId={(await params).id}
            query={await searchParams}
        />
    )
}
export async function AnalyticsActivity({ params, searchParams }: Props) {
    return (
        <CachedAnalyticsActivity
            accountId={(await params).id}
            query={await searchParams}
        />
    )
}
export async function AnalyticsCategories({ params, searchParams }: Props) {
    return (
        <CachedAnalyticsCategories
            accountId={(await params).id}
            query={await searchParams}
        />
    )
}
