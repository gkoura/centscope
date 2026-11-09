import Link from "next/link"
import { invitationPreview } from "@/lib/account-sharing"
import { getCurrentSession } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"
import { acceptAction } from "../../actions"
export async function Invitation({
    query,
}: {
    query: Promise<{ token?: string; unavailable?: string }>
}) {
    const { token } = await query
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
        return (
            <p>
                This invitation is unavailable. Ask the owner for a new
                invitation.
            </p>
        )
    const session = await getCurrentSession()
    const callback =
        "?redirectTo=" +
        encodeURIComponent("/dashboard/sharing/invite?token=" + token)
    if (!session?.user.emailVerified)
        return (
            <p>
                <Link className="underline" href={"/auth/sign-in" + callback}>
                    Sign in
                </Link>{" "}
                or{" "}
                <Link className="underline" href={"/auth/sign-up" + callback}>
                    create an account
                </Link>{" "}
                using the invited email address, then return to this invitation.
            </p>
        )
    const invitation = await invitationPreview(token)
    if (!invitation)
        return (
            <p>
                This invitation is unavailable for {session.user.email}. Check
                the invited address or ask the owner to resend it.
            </p>
        )
    return (
        <form action={acceptAction.bind(null, token)} className="grid gap-4">
            <p>
                Join {invitation.financialAccount.name} using{" "}
                {session.user.email}?
            </p>
            <Button type="submit">Accept invitation</Button>
        </form>
    )
}
