import Link from "next/link"
import { notFound } from "next/navigation"
import { redirect } from "next/navigation"
import { getSharingSettings } from "@/lib/account-sharing"
import { Button } from "@/components/ui/button"
import { sharingAction } from "../../actions"

const field = "rounded-md border bg-background px-3 py-2"

export async function SharingContent({
    params,
    query,
}: {
    params: Promise<{ id: string }>
    query: Promise<{ page?: string; error?: string }>
}) {
    const { id } = await params
    const { error } = await query
    const data = await getSharingSettings(id)
    if (!data) notFound()
    if (!data.isOwner) redirect("/dashboard/accounts/" + id)
    const action = sharingAction.bind(null, id)
    return (
        <>
            <Link href="/dashboard/accounts" className="underline">
                All accounts
            </Link>
            <h2 className="text-xl font-semibold">{data.name}</h2>
            {error && <p role="alert">{error}</p>}
            <form action={action} className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1">
                    Invite by email
                    <input
                        className={field}
                        type="email"
                        required
                        name="email"
                    />
                </label>

                <Button type="submit" name="action" value="invite">
                    Send invitation
                </Button>
            </form>
            <h3 className="font-semibold">Members</h3>
            {!data.members.length && <p>No members yet.</p>}
            {data.members.map((m) => (
                <form
                    className="flex flex-wrap items-center gap-3"
                    key={m.userId}
                    action={action}
                >
                    <input type="hidden" name="target" value={m.userId} />
                    <span>{m.user.email}</span>

                    <Button
                        type="submit"
                        variant="destructive"
                        name="action"
                        value="remove"
                    >
                        Remove
                    </Button>
                </form>
            ))}
            <h3 className="font-semibold">Pending invitations</h3>
            {!data.invites.length && <p>No pending invitations.</p>}
            {data.invites.map((i) => (
                <form
                    key={i.id}
                    action={action}
                    className="flex items-center gap-3"
                >
                    <input type="hidden" name="target" value={i.id} />
                    <span>{i.email}</span>
                    <Button
                        type="submit"
                        variant="outline"
                        name="action"
                        value="cancel"
                    >
                        Cancel invitation
                    </Button>
                </form>
            ))}
        </>
    )
}
