import { getTranslations } from "@/lib/i18n/server"
import { Suspense } from "react"
import { SectionLoading } from "@/components/site/section-loading"
import Link from "@/components/i18n/link"
import { requireVerifiedSession } from "@/lib/auth/session"
import { CreateAccountForm } from "@/components/financial-accounts/create-account-form"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export default async function NewAccountPage() {
    const t = await getTranslations()

    return (
        <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-6 sm:p-10">
            <Link
                href="/dashboard"
                className="text-sm underline underline-offset-4"
            >
                {t("Back to accounts")}
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle>
                        <h1>{t("Create a financial account")}</h1>
                    </CardTitle>
                    <CardDescription>
                        {t(
                            "Give your spending a purpose. Keep personal expenses, home costs, or another part of your life together."
                        )}
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
