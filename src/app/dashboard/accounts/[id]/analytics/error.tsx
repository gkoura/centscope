"use client"
import { RouteError } from "@/components/site/route-error"
export default function AnalyticsError({
    retry,
}: {
    error: unknown
    retry: () => void
}) {
    return <RouteError retry={retry} />
}
