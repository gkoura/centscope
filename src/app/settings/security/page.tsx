import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import Link from "next/link"
import {
    AccountDetails,
    PasswordSettings,
    SecurityMethods,
    SessionSettings,
    DeleteAccountSettings,
} from "./_components/security-methods"

export default function SecurityPage() {
    return (
        <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-6 sm:p-10">
            <Link
                href="/dashboard"
                className="text-sm underline underline-offset-4"
            >
                Back to dashboard
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
                Manage your profile, sign-in methods and account security.
            </p>
            <section
                className="flex flex-col gap-6"
                aria-labelledby="account-heading"
            >
                <h2 id="account-heading" className="text-lg font-semibold">
                    Account
                </h2>
                <Suspense fallback={<SectionLoading />}>
                    <AccountDetails />
                </Suspense>
            </section>
            <section
                className="flex flex-col gap-6"
                aria-labelledby="security-heading"
            >
                <h2 id="security-heading" className="text-lg font-semibold">
                    Security
                </h2>
                <Suspense fallback={<SectionLoading />}>
                    <PasswordSettings />
                </Suspense>
                <Suspense fallback={<SectionLoading />}>
                    <SecurityMethods />
                </Suspense>
                <Suspense fallback={<SectionLoading />}>
                    <SessionSettings />
                </Suspense>
            </section>
            <Suspense fallback={<SectionLoading />}>
                <DeleteAccountSettings />
            </Suspense>
        </main>
    )
}
