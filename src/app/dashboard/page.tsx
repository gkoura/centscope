import Link from "next/link"
import { ArrowUpRightIcon, FolderOpenIcon, PlusIcon } from "lucide-react"
import { listOwnedFinancialAccounts } from "@/lib/financial-accounts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"

export default async function DashboardPage() {
    const accounts = await listOwnedFinancialAccounts()
    return (
        <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-8 p-6 sm:p-10">
            <section
                aria-labelledby="accounts-heading"
                className="flex flex-col gap-6"
            >
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <h1
                            id="accounts-heading"
                            className="text-2xl font-semibold tracking-tight"
                        >
                            Your financial accounts
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            A place for each purpose, from everyday spending to
                            home costs.
                        </p>
                    </div>
                    {accounts.length ? (
                        <Button
                            render={<Link href="/dashboard/accounts/new" />}
                            nativeButton={false}
                        >
                            <PlusIcon data-icon="inline-start" />
                            Create account
                        </Button>
                    ) : null}
                </div>
                {accounts.length ? (
                    <ul className="grid min-w-0 gap-4 sm:grid-cols-2">
                        {accounts.map((account) => (
                            <li key={account.id} className="min-w-0">
                                <Link
                                    href={`/dashboard/accounts/${account.id}`}
                                    className="account-card-link block h-full rounded-xl"
                                    aria-label={`Open ${account.name}`}
                                >
                                    <Card className="h-full">
                                        <CardHeader>
                                            <CardTitle>
                                                <h2 className="wrap-break-word">
                                                    {account.name}
                                                </h2>
                                            </CardTitle>
                                            <CardDescription>
                                                Reporting currency:{" "}
                                                {account.reportingCurrency}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex items-center justify-between gap-4">
                                            <Badge variant="secondary">
                                                Owner
                                            </Badge>
                                            <ArrowUpRightIcon
                                                className="account-card-arrow size-4 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                        </CardContent>
                                    </Card>
                                </Link>
                            </li>
                        ))}
                    </ul>
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
                                Start with Personal, Home, or any purpose you
                                want to track.
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
            </section>
        </main>
    )
}
