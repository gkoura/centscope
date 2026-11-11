"use server"
import { requireVerifiedSession } from "@/lib/auth/session"
import { validateBudgetInput, type BudgetState } from "@/lib/budget-input"
import {
    BudgetWriteError,
    removeRecurringBudget,
    saveRecurringBudget,
    reorderBudgetItems,
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

async function saveOrder(
    accountId: string,
    cadence: import("@/lib/budget-period").BudgetCadence | null,
    input: unknown
) {
    await requireVerifiedSession()
    if (typeof accountId !== "string" || !accountId || accountId.length > 128)
        return { success: false as const, message: "Invalid account." }
    try {
        await reorderBudgetItems(accountId, cadence, input)
    } catch (error) {
        return {
            success: false as const,
            message:
                error instanceof BudgetWriteError
                    ? error.message
                    : "Couldn’t save the order. Try again.",
        }
    }
    await revalidateWorkspacePath(`/dashboard/accounts/${accountId}/budgets`)
    return { success: true as const }
}
export async function reorderBudgetCadences(accountId: string, input: unknown) {
    const result = await saveOrder(accountId, null, input)
    if (!result.success) return result
    const { getBudgetInventory } = await import("@/lib/budget-reading")
    return {
        success: true as const,
        items: (await getBudgetInventory(accountId)).groups,
    }
}
export async function reorderBudgets(
    accountId: string,
    cadence: string,
    date: string,
    mode: string,
    input: unknown
) {
    const { isBudgetCadence, validBudgetDay } =
        await import("@/lib/budget-period")
    if (
        !isBudgetCadence(cadence) ||
        !validBudgetDay(date) ||
        (mode !== "actual" && mode !== "smoothed")
    )
        return { success: false as const, message: "Invalid budget period." }
    const result = await saveOrder(accountId, cadence, input)
    if (!result.success) return result
    const { getRecurringBudgets } = await import("@/lib/budget-reading")
    return {
        success: true as const,
        items: (await getRecurringBudgets(accountId, cadence, date, mode))
            .budgets,
    }
}
