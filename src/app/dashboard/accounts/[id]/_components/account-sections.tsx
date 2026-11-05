import Link from "next/link"
import { workspaceAccount, workspaceWallets } from "@/lib/account-workspace"
import { WalletCards } from "@/components/financial-accounts/wallet-cards"
import { PlusIcon, WalletIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"

type AccountParams = Promise<{ id: string }>
export async function AccountWallets({ params }: { params: AccountParams }) {
    const account = await workspaceAccount((await params).id)
    const wallets = await workspaceWallets(account.id)
    return (
        <section
            aria-labelledby="wallets-heading"
            className="flex flex-col gap-4"
        >
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 id="wallets-heading" className="text-lg font-semibold">
                    Wallets
                </h2>
                {wallets.length ? (
                    <Button
                        render={
                            <Link
                                href={`/dashboard/accounts/${account.id}/wallets/new`}
                            />
                        }
                        nativeButton={false}
                    >
                        <PlusIcon data-icon="inline-start" />
                        Add wallet
                    </Button>
                ) : null}
            </div>
            {wallets.length ? (
                <WalletCards
                    financialAccountId={account.id}
                    wallets={wallets}
                    today={new Date().toISOString().slice(0, 10)}
                />
            ) : (
                <Empty className="border py-10">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <WalletIcon />
                        </EmptyMedia>
                        <EmptyTitle>Add your first wallet</EmptyTitle>
                        <EmptyDescription>
                            Start with a bank account or the cash you keep on
                            hand.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button
                            render={
                                <Link
                                    href={`/dashboard/accounts/${account.id}/wallets/new`}
                                />
                            }
                            nativeButton={false}
                        >
                            <PlusIcon data-icon="inline-start" />
                            Add wallet
                        </Button>
                    </EmptyContent>
                </Empty>
            )}
        </section>
    )
}

export { TransactionWorkspace as AccountTransactions } from "./transaction-workspace"
