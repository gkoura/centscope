import Link from "next/link"
import { FolderOpenIcon, PlusIcon } from "lucide-react"
import { listOwnedFinancialAccounts } from "@/lib/financial-accounts"
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

export async function AccountList() {
    const accounts = await listOwnedFinancialAccounts()
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
