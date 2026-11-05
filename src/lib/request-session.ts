import { AsyncLocalStorage } from "node:async_hooks"
import type { auth } from "@/lib/auth"

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>
const sessions = new AsyncLocalStorage<Session>()

// Route Handlers have no React render cache. This context is isolated per request,
// including parallel requests belonging to different users.
export const currentRequestSession = () => sessions.getStore()
export function withRequestSession<T>(
    session: Session,
    read: () => Promise<T>
) {
    return sessions.run(session, read)
}
