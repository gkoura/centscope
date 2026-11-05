"use server"

import {
    validateWalletDeletionReference,
    validateWalletDeletionInput,
    type WalletDeletionPreview,
} from "@/lib/wallet-deletion-input"
import {
    getOwnedWalletDeletionPreview,
    deleteOwnedWallet,
    WalletDeletionError,
} from "@/lib/wallet-deletion"
import { revalidateWorkspacePath } from "@/lib/workspace-cache-invalidation"
import { redirect } from "next/navigation"
import { requireVerifiedSession } from "@/lib/auth/session"
import {
    validateWalletDetails,
    type WalletDetailsState,
    validateWalletInput,
    type WalletFormState,
} from "@/lib/wallet-input"
import {
    updateOwnedWallet,
    createOwnedWallet,
    WalletCreationError,
} from "@/lib/wallets"

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
    await revalidateWorkspacePath(path)
    redirect(path)
}

export async function updateWallet(
    _state: WalletDetailsState,
    form: FormData
): Promise<WalletDetailsState> {
    await requireVerifiedSession()
    const input = validateWalletDetails(form)
    if (!input)
        return {
            message:
                "Check the wallet name/type and opening balance. Use a valid date, Posted or Pending status, and an amount with at most two decimal places. Refresh if the wallet changed.",
        }
    try {
        await updateOwnedWallet(input)
    } catch (error) {
        return {
            message:
                error instanceof WalletCreationError
                    ? error.message
                    : "We couldn’t save the wallet. Please try again.",
        }
    }
    // A physical wallet may be used in several of the owner's accounts.
    await revalidateWorkspacePath("/dashboard", "layout")
    return { success: true }
}

export async function prepareWalletDeletion(
    raw: unknown
): Promise<{ preview?: WalletDeletionPreview; message?: string }> {
    await requireVerifiedSession()
    const input = validateWalletDeletionReference(raw)
    if (!input) return { message: "Reload this page before deleting a wallet." }
    try {
        return { preview: await getOwnedWalletDeletionPreview(input) }
    } catch (error) {
        return {
            message:
                error instanceof WalletDeletionError
                    ? error.message
                    : "We couldn’t load the wallet’s transactions. Please try again.",
        }
    }
}

export async function deleteWallet(raw: unknown): Promise<WalletDetailsState> {
    await requireVerifiedSession()
    const input = validateWalletDeletionInput(raw)
    if (!input)
        return { message: "Close and reopen the wallet deletion confirmation." }
    try {
        await deleteOwnedWallet(input)
    } catch (error) {
        return {
            message:
                error instanceof WalletDeletionError
                    ? error.message
                    : "We couldn’t confirm deletion. No partial deletion is committed; retry safely or refresh to check the wallet.",
        }
    }
    await revalidateWorkspacePath("/dashboard", "layout")
    return { success: true }
}
