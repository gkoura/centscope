import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { getTranslations } from "@/lib/i18n/server"
import Link from "@/components/i18n/link"
import { Brand } from "./brand"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"

export async function SiteHeader() {
    const t = await getTranslations()

    return (
        <header className="site-header">
            <div className="site-width flex h-20 items-center justify-between gap-4">
                <Brand />
                <nav
                    aria-label={t("Main navigation")}
                    className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"
                >
                    <Link href="/#features" className="hover:text-foreground">
                        {t("Why CentScope")}
                    </Link>
                    <Link
                        href="/#how-it-works"
                        className="hover:text-foreground"
                    >
                        {t("How it works")}
                    </Link>
                </nav>
                <div className="flex items-center gap-2 sm:gap-4">
                    <LanguageSwitcher />
                    <ThemeToggle />
                    <Link
                        href="/auth/sign-in"
                        className="text-sm font-medium hover:text-primary"
                    >
                        {t("Log in")}
                    </Link>
                    <Button
                        render={<Link href="/auth/sign-up" />}
                        nativeButton={false}
                        className="hidden sm:inline-flex"
                    >
                        {t("Sign up")}
                    </Button>
                </div>
            </div>
        </header>
    )
}
