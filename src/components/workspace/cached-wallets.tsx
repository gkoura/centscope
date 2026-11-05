"use client"
import { useWorkspaceQuery, useWorkspaceDay } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import Link from "next/link"
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

export function CachedWallets({ accountId }: { accountId: string }) {
    const reference = useWorkspaceQuery("reference", accountId)
    const today = useWorkspaceDay()
    if (!reference.data || !today)
        return (
            <WorkspaceQueryState
                queries={[reference]}
                label="Loading wallet settings…"
            />
        )
    const { account, wallets } = reference.data
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
                    today={today}
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
