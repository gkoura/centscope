"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { syncRecurring } from "@/app/dashboard/accounts/[id]/recurring/actions"
import { Button } from "@/components/ui/button"
export function RecurringSync({ accountId }: { accountId: string }) {
    const router = useRouter()
    const [attempt, setAttempt] = useState(0),
        [state, setState] = useState({ message: "", error: false })
    useEffect(() => {
        let cancelled = false
        void (async () => {
            let created = 0
            try {
                let more = true
                while (more && !cancelled) {
                    const result = await syncRecurring(accountId)
                    created += result.created ?? 0
                    if (cancelled) return
                    if (result.error) {
                        setState({
                            message:
                                "Some pending copies are not ready yet. Retry to continue safely.",
                            error: true,
                        })
                        return
                    }
                    more = Boolean(result.hasMore)
                    setState({
                        message: more
                            ? `Creating pending transactions… ${created} created.`
                            : created
                              ? `${created} pending transactions created.`
                              : "",
                        error: false,
                    })
                }
                if (created && !cancelled) router.refresh()
            } catch {
                if (!cancelled)
                    setState({
                        message:
                            "Couldn’t prepare pending transactions. Retry to continue safely.",
                        error: true,
                    })
            }
        })()
        return () => {
            cancelled = true
        }
    }, [accountId, attempt, router])
    if (!state.message) return null
    return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <p role="status">{state.message}</p>
            {state.error && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAttempt((value) => value + 1)}
                >
                    Retry
                </Button>
            )}
        </div>
    )
}
