import { SignOutButton } from "@/components/auth/sign-out-button"
import Link from "next/link"
import { FolderOpenIcon, PlusIcon } from "lucide-react"
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
            <header className="flex flex-wrap items-center justify-between gap-4">
                <Link
                    href="/dashboard"
                    className="font-semibold tracking-tight"
                >
                    Fintrack
                </Link>
                <nav
                    aria-label="Account settings"
                    className="flex items-center gap-4"
                >
                    <Link
                        href="/settings/security"
                        className="text-sm underline underline-offset-4"
                    >
                        Sign-in methods
                    </Link>
                    <SignOutButton />
                </nav>
            </header>
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
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            <Link
                                                href={`/dashboard/accounts/${account.id}`}
                                                className="wrap-break-word underline-offset-4 hover:underline"
                                            >
                                                {account.name}
                                            </Link>
                                        </CardTitle>
                                        <CardDescription>
                                            Reporting currency:{" "}
                                            {account.reportingCurrency}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Badge variant="secondary">Owner</Badge>
                                    </CardContent>
                                </Card>
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
