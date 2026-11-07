"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

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
    const t = useTranslations()

    const session = authClient.useSession()
    if (queries.some((query) => query.error?.status === 404)) notFound()
    const failed = queries.find((query) => query.error)
    if ((!failed && !session.error) || failed?.error?.redirectTo)
        return <SectionLoading label={t(label || "")} />
    return (
        <Alert role="status">
            <AlertDescription>
                {t(
                    "Couldn’t load this data. Check your connection and try again."
                )}
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
                    {t("Retry")}
                </Button>
            </AlertAction>
        </Alert>
    )
}
