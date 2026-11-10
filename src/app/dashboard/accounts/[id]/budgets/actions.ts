"use server"
import { requireVerifiedSession } from "@/lib/auth/session"
import { validateBudgetInput, type BudgetState } from "@/lib/budget-input"
import {
    BudgetWriteError,
    removeRecurringBudget,
    saveRecurringBudget,
} from "@/lib/budgets"
import { revalidateWorkspacePath } from "@/lib/workspace-cache-invalidation"

export async function mutateBudget(
    _previous: BudgetState,
    form: FormData
): Promise<BudgetState> {
    await requireVerifiedSession()
    const accountId = form.get("financialAccountId")
    if (typeof accountId !== "string" || !accountId || accountId.length > 128)
        return { message: "Reload this page and try again." }
    try {
        const operation = form.get("operation")
        if (operation === "delete") {
            const id = form.get("id"),
                version = Number(form.get("version"))
            if (
                typeof id !== "string" ||
                !id ||
                id.length > 128 ||
                !Number.isSafeInteger(version) ||
                version < 1
            )
                return { message: "Reload this page and try again." }
            await removeRecurringBudget(accountId, id, version)
        } else if (operation === "save") {
            const input = validateBudgetInput(form)
            if (!input)
                return {
                    message:
                        "Enter a name, a positive limit with up to two decimal places, and valid budget options.",
                }
            await saveRecurringBudget(input)
        } else return { message: "Unknown budget action." }
    } catch (error) {
        return {
            message:
                error instanceof BudgetWriteError
                    ? error.message
                    : "Couldn’t save your budget. Please try again.",
        }
    }
    await revalidateWorkspacePath(`/dashboard/accounts/${accountId}/budgets`)
    return { success: true }
}
