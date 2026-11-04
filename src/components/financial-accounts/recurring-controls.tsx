"use client"
import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    recurringCommand,
    syncRecurring,
    type RecurringState,
} from "@/app/dashboard/accounts/[id]/recurring/actions"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
export function RecurringControls({
    accountId,
    ruleId,
    version,
    paused,
    stopped,
    hasNext,
}: {
    accountId: string
    ruleId: string
    version: number
    paused: boolean
    stopped: boolean
    hasNext: boolean
}) {
    const [state, action, pending] = useActionState(
        recurringCommand,
        {} as RecurringState
    )
    return (
        <form
            action={action}
            className="flex flex-col gap-3"
            onSubmit={(event) => {
                const command = (
                    event.nativeEvent as SubmitEvent
                ).submitter?.getAttribute("value")
                if (
                    command === "stop" &&
                    !window.confirm(
                        "Stop this recurring schedule? Existing transactions remain. No new occurrences will be created."
                    )
                )
                    event.preventDefault()
                if (
                    command === "resume" &&
                    !window.confirm(
                        "Resume creating Pending copies for this schedule? Existing transactions keep their current status."
                    )
                )
                    event.preventDefault()
            }}
        >
            <input type="hidden" name="financialAccountId" value={accountId} />
            <input type="hidden" name="ruleId" value={ruleId} />
            <input type="hidden" name="expectedVersion" value={version} />
            {!stopped && (
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="submit"
                        variant="outline"
                        name="command"
                        value={paused ? "resume" : "pause"}
                        disabled={pending}
                    >
                        {paused ? "Resume" : "Pause"}
                    </Button>
                    {hasNext && !paused && (
                        <Button
                            type="submit"
                            variant="outline"
                            name="command"
                            value="skip"
                            disabled={pending}
                        >
                            Skip next
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="destructive"
                        name="command"
                        value="stop"
                        disabled={pending}
                    >
                        Stop
                    </Button>
                </div>
            )}
            {state.message &&
                (state.error ? (
                    <FieldError role="alert">{state.message}</FieldError>
                ) : (
                    <p role="status" className="text-sm text-muted-foreground">
                        {state.message}
                    </p>
                ))}
        </form>
    )
}
export function SyncRecurringButton({ accountId }: { accountId: string }) {
    const [pending, start] = useTransition(),
        [message, setMessage] = useState(""),
        router = useRouter()
    return (
        <div className="flex flex-col items-start gap-2">
            <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                    start(async () => {
                        try {
                            let created = 0,
                                more = true
                            while (more) {
                                const result = await syncRecurring(accountId)
                                created += result.created ?? 0
                                setMessage(
                                    result.error
                                        ? (result.message ??
                                              "Retry to continue safely.")
                                        : `${created} pending transactions created.`
                                )
                                if (result.error) break
                                more = Boolean(result.hasMore)
                            }
                            router.refresh()
                        } catch {
                            setMessage(
                                "Couldn’t prepare pending copies. Please try again."
                            )
                        }
                    })
                }
            >
                {pending ? "Preparing…" : "Prepare pending transactions"}
            </Button>
            <p role="status" className="text-sm text-muted-foreground">
                {message}
            </p>
        </div>
    )
}
