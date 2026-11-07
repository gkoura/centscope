import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { getTranslations } from "@/lib/i18n/server"
import Link from "@/components/i18n/link"
import { ArrowLeft, Check } from "lucide-react"
import { Brand } from "@/components/site/brand"
import { ThemeToggle } from "@/components/site/theme-toggle"

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const t = await getTranslations()

    return (
        <div className="auth-layout">
            <aside className="auth-story">
                <Brand />
                <div className="my-auto py-16">
                    <p className="eyebrow">
                        {t("A LITTLE CLARITY CHANGES EVERYTHING")}
                    </p>
                    <h2 className="auth-headline">
                        {t("Good things start")}
                        <br />
                        {t("with a clearer")}
                        <br />
                        <span className="text-primary">
                            {t("perspective.")}
                        </span>
                    </h2>
                    <p className="mt-6 max-w-sm text-sm leading-7 text-muted-foreground">
                        {t(
                            "One place for the different parts of your financial life. Thoughtfully organized, comfortably yours."
                        )}
                    </p>
                    <div className="mt-10 flex flex-col gap-4 text-sm">
                        {[
                            t("Separate spaces for every purpose"),
                            t("Your accounts, at a glance"),
                            t("A workspace that feels like you"),
                        ].map((text) => (
                            <p key={text} className="flex items-center gap-3">
                                <Check className="size-4 text-primary" />
                                {text}
                            </p>
                        ))}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    {t("Make sense of every cent.")}
                </p>
            </aside>
            <div className="flex min-w-0 flex-col">
                <header className="flex items-center justify-between p-5 sm:p-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        {t("Back to home")}
                    </Link>
                    <div className="flex items-center gap-1">
                        <LanguageSwitcher />
                        <ThemeToggle />
                    </div>
                </header>
                <main
                    id="main-content"
                    className="flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-10"
                >
                    <div className="mb-8 lg:hidden">
                        <Brand />
                    </div>
                    <div className="auth-form-surface">{children}</div>
                    <p className="mt-7 max-w-xs text-center text-xs leading-6 text-muted-foreground">
                        {t("A calmer space for your financial life.")}
                        <br />
                        {t("Make yourself at home.")}
                    </p>
                </main>
                <footer className="p-6 text-center text-xs text-muted-foreground">
                    {t("CentScope · Make sense of every cent.")}
                </footer>
            </div>
        </div>
    )
}
