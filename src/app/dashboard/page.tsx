import { SignOutButton } from "@/components/auth/sign-out-button"
import Link from "next/link"
import { requireVerifiedSession } from "@/lib/auth/session"

export default async function DashboardPage() {
    const { user } = await requireVerifiedSession()
    return (
        <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-6 sm:p-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Welcome, {user.name}
                </h1>
                <p className="break-words text-muted-foreground">
                    {user.email}
                </p>
                <p className="text-sm text-muted-foreground">
                    Your email is verified and you’re signed in.
                </p>
            </div>
            <div>
                <Link
                    href="/settings/security"
                    className="mb-4 block text-sm underline underline-offset-4"
                >
                    Manage sign-in methods
                </Link>
                <SignOutButton />
            </div>
        </main>
    )
}
