"use client"
import { notFound } from "next/navigation"
import { SectionLoading } from "@/components/site/section-loading"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertAction } from "@/components/ui/alert"
import { authClient } from "@/lib/auth-client"
import type { WorkspaceReadError } from "./use-workspace-query"

export function WorkspaceQueryState({
    queries,
    label = "Loading your workspace…",
}: {
    queries: { error: WorkspaceReadError | null; refetch: () => unknown }[]
    label?: string
}) {
    const session = authClient.useSession()
    if (queries.some((query) => query.error?.status === 404)) notFound()
    const failed = queries.find((query) => query.error)
    if ((!failed && !session.error) || failed?.error?.redirectTo)
        return <SectionLoading label={label} />
    return (
        <Alert role="status">
            <AlertDescription>
                Couldn’t load this data. Check your connection and try again.
            </AlertDescription>
            <AlertAction>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        if (session.error) void session.refetch()
                        queries.forEach((query) => {
                            void query.refetch()
                        })
                    }}
                >
                    Retry
                </Button>
            </AlertAction>
        </Alert>
    )
}
