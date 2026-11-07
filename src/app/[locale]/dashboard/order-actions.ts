"use server"

import { revalidateWorkspacePath } from "@/lib/workspace-cache-invalidation"
import { requireVerifiedSession } from "@/lib/auth/session"
import {
    listOwnedFinancialAccounts,
    reorderOwnedFinancialAccounts,
} from "@/lib/financial-accounts"
import {
    listOwnedAccountWallets,
    reorderOwnedAccountWallets,
} from "@/lib/wallets"
import { ListOrderError } from "@/lib/list-order-error"
import type { ListOrderInput, OrderSaveResult } from "@/lib/list-order"

export async function saveAccountOrder(
    input: ListOrderInput
): Promise<
    OrderSaveResult<
        Awaited<ReturnType<typeof listOwnedFinancialAccounts>>[number]
    >
> {
    await requireVerifiedSession()
    try {
        await reorderOwnedFinancialAccounts(input)
    } catch (error) {
        await revalidateWorkspacePath("/dashboard", "layout")
        return {
            success: false,
            message:
                error instanceof ListOrderError
                    ? error.message
                    : "Couldn’t save your account order. Your changes are kept; try again.",
        }
    }
    await revalidateWorkspacePath("/dashboard", "layout")
    return { success: true, items: await listOwnedFinancialAccounts() }
}

export async function saveWalletOrder(
    financialAccountId: string,
    input: ListOrderInput
): Promise<
    OrderSaveResult<Awaited<ReturnType<typeof listOwnedAccountWallets>>[number]>
> {
    await requireVerifiedSession()
    if (
        typeof financialAccountId !== "string" ||
        !financialAccountId ||
        financialAccountId.length > 128
    )
        return { success: false, message: "This account is unavailable." }
    const path = `/dashboard/accounts/${financialAccountId}`
    try {
        await reorderOwnedAccountWallets(financialAccountId, input)
    } catch (error) {
        await revalidateWorkspacePath(path, "layout")
        return {
            success: false,
            message:
                error instanceof ListOrderError
                    ? error.message
                    : "Couldn’t save your wallet order. Your changes are kept; try again.",
        }
    }
    await revalidateWorkspacePath(path, "layout")
    await revalidateWorkspacePath(`${path}/transactions/new`)
    return {
        success: true,
        items: await listOwnedAccountWallets(financialAccountId),
    }
}
