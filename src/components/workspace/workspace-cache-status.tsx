"use client"
import { useCallback, useSyncExternalStore } from "react"
import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { belongsToWorkspace } from "@/lib/workspace-cache-policy"
import { useWorkspaceScope } from "./workspace-cache-provider"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertAction } from "@/components/ui/alert"

export function WorkspaceCacheStatus() {
    const client = useQueryClient()
    const { userId, revision, ready } = useWorkspaceScope()
    const fetching = useIsFetching({
        predicate: (query) =>
            belongsToWorkspace(query.queryKey, userId, revision),
    })
    const subscribe = useCallback(
        (update: () => void) => client.getQueryCache().subscribe(update),
        [client]
    )
    const failed = useSyncExternalStore(
        subscribe,
        () =>
            client.getQueryCache().findAll({
                predicate: (query) =>
                    belongsToWorkspace(query.queryKey, userId, revision) &&
                    query.getObserversCount() > 0 &&
                    query.state.status === "error" &&
                    query.state.data !== undefined,
            }).length > 0,
        () => false
    )
    if (!ready) return null
    if (failed)
        return (
            <Alert role="status" className="mb-3">
                <AlertDescription>
                    Couldn’t refresh. Showing saved data.
                </AlertDescription>
                <AlertAction>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            void client.refetchQueries({
                                queryKey: ["workspace"],
                                type: "active",
                            })
                        }}
                    >
                        Retry
                    </Button>
                </AlertAction>
            </Alert>
        )
    return (
        <span role="status" className="sr-only">
            {fetching ? "Refreshing your workspace…" : "Workspace loaded."}
        </span>
    )
}
