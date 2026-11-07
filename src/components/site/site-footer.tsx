import { getTranslations } from "@/lib/i18n/server"
import Link from "@/components/i18n/link"
import { cacheLife } from "next/cache"
import { Brand } from "./brand"
export async function SiteFooter() {
    "use cache"
    const t = await getTranslations()
    cacheLife("days")
    return (
        <footer className="border-t">
            <div className="site-width flex flex-col justify-between gap-6 py-9 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-3">
                    <Brand />
                    <p className="text-sm text-muted-foreground">
                        {t("Make sense of every cent.")}
                    </p>
                </div>
                <nav
                    aria-label={t("Footer")}
                    className="flex flex-wrap gap-6 text-sm text-muted-foreground"
                >
                    <Link href="/#features">{t("Features")}</Link>
                    <Link href="/auth/sign-in">{t("Log in")}</Link>
                    <Link href="/auth/sign-up">{t("Create an account")}</Link>
                </nav>
                <p className="text-xs text-muted-foreground">
                    © {new Date().getFullYear()} {t("CentScope")}
                </p>
            </div>
        </footer>
    )
}
