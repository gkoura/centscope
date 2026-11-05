"use server"
import { revalidateWorkspacePath } from "@/lib/workspace-cache-invalidation"
import { syncOwnedRecurring, commandOwnedRecurring } from "@/lib/recurring"
import { RecurrenceError } from "@/lib/recurrence-engine"
export type RecurringState = {
    message?: string
    error?: boolean
    hasMore?: boolean
    created?: number
}
export async function syncRecurring(
    accountId: string
): Promise<RecurringState> {
    const result = await syncOwnedRecurring(accountId)
    if (result.created)
        await revalidateWorkspacePath(`/dashboard/accounts/${accountId}`, "layout")
    return {
        created: result.created,
        hasMore: result.hasMore,
        message: `${result.created} pending occurrence${result.created === 1 ? "" : "s"} created.${result.failed ? " Some pending copies could not be created. Try again." : ""}`,
        error: result.failed > 0,
    }
}
export async function recurringCommand(
    _state: RecurringState,
    form: FormData
): Promise<RecurringState> {
    try {
        await commandOwnedRecurring(form)
    } catch (error) {
        return {
            error: true,
            message:
                error instanceof RecurrenceError
                    ? error.message
                    : "We couldn’t update this schedule. Please try again.",
        }
    }
    await revalidateWorkspacePath(
        `/dashboard/accounts/${String(form.get("financialAccountId"))}`,
        "layout"
    )
    return { message: "Schedule updated." }
}
