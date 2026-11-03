import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import Link from "next/link"
import { requireVerifiedSession } from "@/lib/auth/session"
import { CreateAccountForm } from "@/components/financial-accounts/create-account-form"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export default function NewAccountPage() {
    return (
        <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-6 sm:p-10">
            <Link
                href="/dashboard"
                className="text-sm underline underline-offset-4"
            >
                Back to accounts
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle>
                        <h1>Create a financial account</h1>
                    </CardTitle>
                    <CardDescription>
                        Give your spending a purpose. Keep personal expenses,
                        home costs, or another part of your life together.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<SectionLoading />}>
                        <AccountForm />
                    </Suspense>
                </CardContent>
            </Card>
        </main>
    )
}

async function AccountForm() {
    await requireVerifiedSession()
    return <CreateAccountForm />
}
