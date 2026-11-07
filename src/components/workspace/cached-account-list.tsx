"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import Link from "@/components/i18n/link"
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
    const t = useTranslations()

    const result = useWorkspaceQuery("accounts")
    if (!result.data)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label={t("Loading your accounts…")}
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
                            {t("Create your first financial account")}
                        </EmptyTitle>
                        <EmptyDescription>
                            {t(
                                "Start with Personal, Home, or any purpose you want to track."
                            )}
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button
                            render={<Link href="/dashboard/accounts/new" />}
                            nativeButton={false}
                        >
                            <PlusIcon data-icon="inline-start" />
                            {t("Create account")}
                        </Button>
                    </EmptyContent>
                </Empty>
            )}
        </>
    )
}
