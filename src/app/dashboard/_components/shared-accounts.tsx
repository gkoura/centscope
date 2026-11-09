import { listSharedAccounts } from "@/lib/account-sharing"
import { sharingAction } from "../sharing/actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AccountCard } from "@/components/financial-accounts/account-card"

export async function SharedAccounts() {
    const accounts = await listSharedAccounts()
    if (!accounts.length) return null
    return (
        <section className="grid gap-4">
            <h2 className="text-xl font-semibold">Shared with you</h2>
            <div className="grid gap-4 sm:grid-cols-2">
                {accounts.map(({ financialAccount: account }) => (
                    <AccountCard
                        key={account.id}
                        account={account}
                        isOwner={false}
                        status={<Badge variant="secondary">Member</Badge>}
                        extraAction={
                            <form action={sharingAction.bind(null, account.id)}>
                                <Button
                                    type="submit"
                                    name="action"
                                    value="leave"
                                    variant="ghost"
                                >
                                    Leave account
                                </Button>
                            </form>
                        }
                    />
                ))}
            </div>
        </section>
    )
}
