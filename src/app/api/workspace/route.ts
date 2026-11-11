import { BudgetUnavailableError } from "@/lib/budget-reading"
import { cookies } from "next/headers"
import { getCurrentSession } from "@/lib/auth/session"
import { workspaceAccountOrNull } from "@/lib/account-workspace"
import {
    canonicalWorkspaceRequest,
    workspaceResources,
    WORKSPACE_REVISION_COOKIE,
    type WorkspaceResource,
} from "@/lib/workspace-cache-policy"
import { readWorkspaceData } from "@/lib/workspace-data"
import { withRequestSession } from "@/lib/request-session"

const privateHeaders = {
    "Cache-Control": "private, no-store",
    Vary: "Cookie, X-Fintrack-User, X-Fintrack-Revision",
}
function json(body: unknown, status = 200) {
    return Response.json(body, { status, headers: privateHeaders })
}

export async function GET(request: Request) {
    const session = await getCurrentSession()
    if (!session) return json({ redirectTo: "/auth/sign-in" }, 401)
    if (!session.user.emailVerified)
        return json({ redirectTo: "/auth/verify-email" }, 403)
    // Reject responses for a session that switched while this browser request was in flight.
    if (request.headers.get("X-Fintrack-User") !== session.user.id)
        return json({ redirectTo: "/auth/sign-in" }, 401)
    const revision =
        (await cookies()).get(WORKSPACE_REVISION_COOKIE)?.value ?? "initial"
    if (request.headers.get("X-Fintrack-Revision") !== revision)
        return json({ changed: true }, 409)
    const url = new URL(request.url)
    const resource = url.searchParams.get("resource") as WorkspaceResource
    if (!workspaceResources.includes(resource))
        return json({ message: "Unknown workspace data." }, 400)
    const accountId = url.searchParams.get("accountId") ?? undefined
    if (resource !== "accounts" && (!accountId || accountId.length > 128))
        return json({ message: "Invalid account." }, 400)
    const query: Record<string, string | string[]> = {}
    for (const key of new Set(url.searchParams.keys())) {
        const values = url.searchParams.getAll(key)
        query[key] = values.length > 1 ? values : values[0]
    }
    const input = canonicalWorkspaceRequest(
        { resource, accountId, query },
        new Date().toISOString().slice(0, 10)
    )
    return withRequestSession(session, async () => {
        const account =
            resource === "accounts"
                ? undefined
                : await workspaceAccountOrNull(accountId!)
        if (resource !== "accounts" && !account)
            return json({ message: "This account is unavailable." }, 404)
        try {
            const data = await readWorkspaceData(input, account ?? undefined)
            return json({ userId: session.user.id, revision, data })
        } catch (error) {
            if (error instanceof BudgetUnavailableError)
                return json({ message: error.message }, 410)
            throw error
        }
    })
}
