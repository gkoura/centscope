import Link from "next/link"
import { Brand } from "./brand"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
    return (
        <header className="site-header">
            <div className="site-width flex h-20 items-center justify-between gap-4">
                <Brand />
                <nav
                    aria-label="Main navigation"
                    className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"
                >
                    <Link href="/#features" className="hover:text-foreground">
                        Why CentScope
                    </Link>
                    <Link
                        href="/#how-it-works"
                        className="hover:text-foreground"
                    >
                        How it works
                    </Link>
                </nav>
                <div className="flex items-center gap-2 sm:gap-4">
                    <ThemeToggle />
                    <Link
                        href="/auth/sign-in"
                        className="text-sm font-medium hover:text-primary"
                    >
                        Log in
                    </Link>
                    <Button
                        render={<Link href="/auth/sign-up" />}
                        nativeButton={false}
                        className="hidden sm:inline-flex"
                    >
                        Sign up
                    </Button>
                </div>
            </div>
        </header>
    )
}
