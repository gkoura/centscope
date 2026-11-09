"use server"

import { requireVerifiedSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { isAccountTheme } from "@/lib/account-theme"
import { revalidateWorkspacePath } from "@/lib/workspace-cache-invalidation"

export async function saveAccountTheme(accountId: string, theme: string) {
    const { user } = await requireVerifiedSession()
    if (
        typeof accountId !== "string" ||
        !accountId ||
        accountId.length > 128 ||
        !isAccountTheme(theme)
    ) {
        return { success: false, message: "Choose a valid account theme." }
    }
    try {
        // Ownership and archive state are checked atomically with the write.
        const result = await prisma.financialAccount.updateMany({
            where: { id: accountId, ownerId: user.id, archivedAt: null },
            data: { theme },
        })
        if (result.count !== 1) {
            return {
                success: false,
                message: "Only the account owner can change its theme.",
            }
        }
    } catch {
        return {
            success: false,
            message: "Couldn’t save the theme. Please try again.",
        }
    }
    await revalidateWorkspacePath("/dashboard", "layout")
    return { success: true, message: "Account theme saved." }
}
