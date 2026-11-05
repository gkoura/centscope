import "server-only"
import { cache } from "react"
import { notFound } from "next/navigation"
import {
    getOwnedFinancialAccount,
    listOwnedFinancialAccounts,
} from "@/lib/financial-accounts"
import { listOwnedAccountWallets } from "@/lib/wallets"
export const workspaceAccounts = cache(listOwnedFinancialAccounts)
export const workspaceWallets = cache(listOwnedAccountWallets)
export const workspaceAccountOrNull = cache(getOwnedFinancialAccount)
export const workspaceAccount = cache(async (id: string) => {
    const account = await workspaceAccountOrNull(id)
    if (!account) notFound()
    return account
})
