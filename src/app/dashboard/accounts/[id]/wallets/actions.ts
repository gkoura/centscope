"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireVerifiedSession } from "@/lib/auth/session"
import { validateWalletInput, type WalletFormState } from "@/lib/wallet-input"
import { createOwnedWallet, WalletCreationError } from "@/lib/wallets"

export async function createWallet(
    _state: WalletFormState,
    formData: FormData
): Promise<WalletFormState> {
    await requireVerifiedSession()
    const result = validateWalletInput(formData)
    if (!result.data) return { errors: result.errors, values: result.values }
    try {
        await createOwnedWallet(result.data)
    } catch (error) {
        return {
            values: result.data,
            message:
                error instanceof WalletCreationError
                    ? error.message
                    : "We couldn’t create your wallet. Please try again.",
        }
    }
    const path = `/dashboard/accounts/${result.data.financialAccountId}`
    revalidatePath(path)
    redirect(path)
}
