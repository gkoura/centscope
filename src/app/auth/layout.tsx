import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"
import { Brand } from "@/components/site/brand"
import { ThemeToggle } from "@/components/site/theme-toggle"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="auth-layout">
            <aside className="auth-story">
                <Brand />
                <div className="my-auto py-16">
                    <p className="eyebrow">
                        A LITTLE CLARITY CHANGES EVERYTHING
                    </p>
                    <h2 className="auth-headline">
                        Good things start
                        <br />
                        with a clearer
                        <br />
                        <span className="text-primary">perspective.</span>
                    </h2>
                    <p className="mt-6 max-w-sm text-sm leading-7 text-muted-foreground">
                        One place for the different parts of your financial
                        life. Thoughtfully organized, comfortably yours.
                    </p>
                    <div className="mt-10 flex flex-col gap-4 text-sm">
                        {[
                            "Separate spaces for every purpose",
                            "Your accounts, at a glance",
                            "A workspace that feels like you",
                        ].map((text) => (
                            <p key={text} className="flex items-center gap-3">
                                <Check className="size-4 text-primary" />
                                {text}
                            </p>
                        ))}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Your money, in focus.
                </p>
            </aside>
            <div className="flex min-w-0 flex-col">
                <header className="flex items-center justify-between p-5 sm:p-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Back to home
                    </Link>
                    <ThemeToggle />
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
                        A calmer space for your financial life.
                        <br />
                        Make yourself at home.
                    </p>
                </main>
                <footer className="p-6 text-center text-xs text-muted-foreground">
                    CentScope · Your money, in focus.
                </footer>
            </div>
        </div>
    )
}
