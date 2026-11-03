"use client"
import { RouteError } from "@/components/site/route-error"
export default function Error({
    retry,
}: {
    error: unknown
    retry: () => void
}) {
    return <RouteError retry={retry} />
}
