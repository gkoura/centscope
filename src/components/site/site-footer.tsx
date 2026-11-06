import Link from "next/link"
import { cacheLife } from "next/cache"
import { Brand } from "./brand"
export async function SiteFooter() {
    "use cache"
    cacheLife("days")
    return (
        <footer className="border-t">
            <div className="site-width flex flex-col justify-between gap-6 py-9 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-3">
                    <Brand />
                    <p className="text-sm text-muted-foreground">
                        Your money, in focus.
                    </p>
                </div>
                <nav
                    aria-label="Footer"
                    className="flex flex-wrap gap-6 text-sm text-muted-foreground"
                >
                    <Link href="/#features">Features</Link>
                    <Link href="/auth/sign-in">Log in</Link>
                    <Link href="/auth/sign-up">Create an account</Link>
                </nav>
                <p className="text-xs text-muted-foreground">
                    © {new Date().getFullYear()} CentScope
                </p>
            </div>
        </footer>
    )
}
