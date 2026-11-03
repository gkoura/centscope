import Link from "next/link"
import { notFound } from "next/navigation"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export default async function AccountPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const account = await getOwnedFinancialAccount(id)
    if (!account) notFound()
    return (
        <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 p-6 sm:p-10">
            <Link
                href="/dashboard"
                className="text-sm underline underline-offset-4"
            >
                Back to accounts
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle>
                        <h1 className="break-words">{account.name}</h1>
                    </CardTitle>
                    <CardDescription>
                        Reporting currency: {account.reportingCurrency}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-start gap-4">
                    <Badge variant="secondary">Owner</Badge>
                    <p className="text-sm text-muted-foreground">
                        Your financial account is ready. Wallets and expense
                        tracking are coming next.
                    </p>
                </CardContent>
            </Card>
        </main>
    )
}
