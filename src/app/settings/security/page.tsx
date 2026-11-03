import Link from "next/link"
import { LinkedAccounts } from "@/components/auth/settings/security/linked-accounts"
import { requireVerifiedSession } from "@/lib/auth/session"

export default async function SecurityPage() {
    await requireVerifiedSession()
    return (
        <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-6 sm:p-10">
            <Link
                href="/dashboard"
                className="text-sm underline underline-offset-4"
            >
                Back to dashboard
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
                Sign-in methods
            </h1>
            <p className="text-sm text-muted-foreground">
                Connect Google using the same email address as your Fintrack
                account.
            </p>
            <LinkedAccounts />
        </main>
    )
}
