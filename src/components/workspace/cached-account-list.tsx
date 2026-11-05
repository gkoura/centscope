"use client"
import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import Link from "next/link"
import { FolderOpenIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AccountCards } from "@/components/financial-accounts/account-cards"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"

export function CachedAccountList() {
    const result = useWorkspaceQuery("accounts")
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label="Loading your accounts…"
            />
        )
    const accounts = result.data
    return (
        <>
            {accounts.length ? (
                <AccountCards accounts={accounts} />
            ) : (
                <Empty className="border py-12">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FolderOpenIcon />
                        </EmptyMedia>
                        <EmptyTitle>
                            Create your first financial account
                        </EmptyTitle>
                        <EmptyDescription>
                            Start with Personal, Home, or any purpose you want
                            to track.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button
                            render={<Link href="/dashboard/accounts/new" />}
                            nativeButton={false}
                        >
                            <PlusIcon data-icon="inline-start" />
                            Create account
                        </Button>
                    </EmptyContent>
                </Empty>
            )}
        </>
    )
}
