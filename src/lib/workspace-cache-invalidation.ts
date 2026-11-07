import "server-only"
import { randomUUID } from "node:crypto"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { WORKSPACE_REVISION_COOKIE } from "@/lib/workspace-cache-policy"
import { locales, localizeHref } from "@/lib/i18n/config"

/** Call only after a committed financial write. The cookie also rerenders layouts after Server Actions. */
export async function markWorkspaceChanged() {
    ;(await cookies()).set(WORKSPACE_REVISION_COOKIE, randomUUID(), {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
    })
}

export async function revalidateWorkspacePath(
    path: string,
    type?: "layout" | "page"
) {
    await markWorkspaceChanged()
    for (const locale of locales)
        revalidatePath(localizeHref(path, locale), type)
}
