"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireVerifiedSession } from "@/lib/auth/session"
import { createOwnedFinancialAccount } from "@/lib/financial-accounts"
import {
    validateFinancialAccountInput,
    type CreateAccountState,
} from "@/lib/financial-account-input"

export async function createFinancialAccount(
    _previousState: CreateAccountState,
    formData: FormData
): Promise<CreateAccountState> {
    await requireVerifiedSession()
    const result = validateFinancialAccountInput(formData)
    if (!result.data) return { errors: result.errors }
    let account
    try {
        account = await createOwnedFinancialAccount(result.data)
    } catch {
        return { message: "We couldn’t create your account. Please try again." }
    }
    revalidatePath("/dashboard")
    redirect(`/dashboard/accounts/${account.id}`)
}
