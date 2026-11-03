"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireVerifiedSession } from "@/lib/auth/session"
import {
    validateStatusInput,
    validateTransactionInput,
    type TransactionFormState,
} from "@/lib/transaction-input"
import {
    createOwnedTransaction,
    changeOwnedTransactionStatus,
    TransactionWriteError,
} from "@/lib/transactions"

export async function createTransaction(
    _state: TransactionFormState,
    form: FormData
): Promise<TransactionFormState> {
    await requireVerifiedSession()
    const result = validateTransactionInput(form)
    if (!result.data) return { errors: result.errors }
    try {
        await createOwnedTransaction(result.data)
    } catch (error) {
        return {
            message:
                error instanceof TransactionWriteError
                    ? error.message
                    : "We couldn’t save your transaction. Please try again.",
        }
    }
    const path = `/dashboard/accounts/${result.data.financialAccountId}`
    revalidatePath(path)
    redirect(path)
}

export async function changeTransactionStatus(
    _state: TransactionFormState,
    form: FormData
): Promise<TransactionFormState> {
    await requireVerifiedSession()
    const input = validateStatusInput(form)
    if (!input) return { message: "Reload this page and try again." }
    try {
        await changeOwnedTransactionStatus(input)
    } catch (error) {
        return {
            message:
                error instanceof TransactionWriteError
                    ? error.message
                    : "We couldn’t change the status. Please try again.",
        }
    }
    revalidatePath(`/dashboard/accounts/${input.financialAccountId}`)
    return {}
}
