import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import Link from "next/link"
import { SecurityMethods } from "./_components/security-methods"

export default function SecurityPage() {
    return (
        <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-6 sm:p-10">
            <Link
                href="/dashboard"
                className="text-sm underline underline-offset-4"
            >
                Back to dashboard
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
                Account settings
            </h1>
            <p className="text-sm text-muted-foreground">
                Connect Google using the same email address as your CentScope
                account. Manage your sign-in methods or delete your account
                below.
            </p>
            <Suspense fallback={<SectionLoading />}>
                <SecurityMethods />
            </Suspense>
        </main>
    )
}
