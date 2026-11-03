import { Suspense } from "react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import {
    ArrowRight,
    Check,
    FolderOpen,
    Globe2,
    SlidersHorizontal,
    ArrowUpRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { AccountPreview } from "@/components/site/account-preview"

export default function Page() {
    return (
        <>
            <Suspense fallback={null}>
                <SessionRedirect />
            </Suspense>
            <SiteHeader />
            <main id="main-content">
                <section className="site-width hero-grid">
                    <div className="hero-copy">
                        <p className="eyebrow">
                            <span className="size-1.5 rounded-full bg-primary" />{" "}
                            LESS GUESSWORK. MORE CLARITY.
                        </p>
                        <h1>
                            Your money.
                            <br />
                            Your life.
                            <br />
                            <span className="text-primary">
                                In perspective.
                            </span>
                        </h1>
                        <p className="hero-description">
                            A calmer place to make sense of your finances. Bring
                            your accounts together, give every purpose a place,
                            and move forward with confidence.
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                            <Button
                                size="lg"
                                className="h-12 px-6"
                                render={<Link href="/auth/sign-up" />}
                                nativeButton={false}
                            >
                                Find your clarity{" "}
                                <ArrowRight data-icon="inline-end" />
                            </Button>
                            <a
                                href="#how-it-works"
                                className="inline-flex items-center gap-2 px-2 py-3 text-sm font-medium"
                            >
                                Take a closer look{" "}
                                <ArrowUpRight className="size-4" />
                            </a>
                        </div>
                        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="size-3.5 text-primary" /> A simple
                            start. A clearer picture.
                        </p>
                    </div>
                    <div className="hero-visual">
                        <div className="visual-orbit" />
                        <AccountPreview />
                        <span className="visual-caption">
                            A little organization goes a long way.
                        </span>
                    </div>
                </section>
                <section id="features" className="border-y bg-muted/35">
                    <div className="site-width py-16 md:py-20">
                        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                            <div>
                                <p className="eyebrow">ROOM FOR REAL LIFE</p>
                                <h2 className="section-title">
                                    Less scattered.
                                    <br />
                                    More in control.
                                </h2>
                            </div>
                            <p className="max-w-sm text-sm leading-7 text-muted-foreground">
                                Personal spending, a shared home, your next
                                chapter. Your finances should fit the way you
                                live.
                            </p>
                        </div>
                        <div className="grid gap-9 md:grid-cols-3">
                            {[
                                {
                                    icon: FolderOpen,
                                    title: "A place for every purpose",
                                    text: "Keep personal, home, and other financial accounts organized in their own spaces.",
                                },
                                {
                                    icon: Globe2,
                                    title: "Your world. Your currency.",
                                    text: "Choose a reporting currency for each account. Keep the context that matters to you.",
                                },
                                {
                                    icon: SlidersHorizontal,
                                    title: "Clarity without the clutter",
                                    text: "A focused workspace that puts your accounts first. Less searching, more perspective.",
                                },
                            ].map(({ icon: Icon, title, text }, i) => (
                                <article key={title} className="feature-item">
                                    <div className="mb-6 flex items-center justify-between">
                                        <Icon
                                            className="size-6 text-primary"
                                            strokeWidth={1.5}
                                        />
                                        <span className="font-mono text-xs text-muted-foreground">
                                            0{i + 1}
                                        </span>
                                    </div>
                                    <h3 className="mb-3 text-base font-semibold tracking-tight">
                                        {title}
                                    </h3>
                                    <p className="text-sm leading-7 text-muted-foreground">
                                        {text}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
                <section
                    id="how-it-works"
                    className="site-width grid gap-12 py-20 md:grid-cols-2 md:py-28"
                >
                    <div>
                        <p className="eyebrow">START SMALL. SEE CLEARER.</p>
                        <h2 className="section-title">
                            A fresh perspective,
                            <br />
                            in a few simple steps.
                        </h2>
                        <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
                            You don’t need to have everything figured out. Just
                            start with a place for your money.
                        </p>
                    </div>
                    <ol className="flex flex-col gap-8">
                        {[
                            [
                                "Make yourself at home",
                                "Create your account and settle into your own workspace.",
                            ],
                            [
                                "Give your money a place",
                                "Create a financial account, name its purpose, and choose its reporting currency.",
                            ],
                            [
                                "Keep life organized",
                                "Return to one clear overview of the financial accounts you’ve created.",
                            ],
                        ].map(([title, text], i) => (
                            <li key={title} className="flex gap-5">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border font-mono text-xs text-primary">
                                    0{i + 1}
                                </span>
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold">
                                        {title}
                                    </h3>
                                    <p className="text-sm leading-6 text-muted-foreground">
                                        {text}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>
                <section className="site-width pb-20">
                    <div className="landing-cta">
                        <div>
                            <p className="eyebrow">YOUR NEXT CHAPTER</p>
                            <h2 className="section-title">
                                Make room for a clearer tomorrow.
                            </h2>
                            <p className="mt-4 text-sm text-muted-foreground">
                                Start with your first account. Take it from
                                there.
                            </p>
                        </div>
                        <Button
                            size="lg"
                            className="h-12 px-6"
                            render={<Link href="/auth/sign-up" />}
                            nativeButton={false}
                        >
                            Get started <ArrowRight data-icon="inline-end" />
                        </Button>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </>
    )
}

async function SessionRedirect() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (session) redirect("/dashboard")

    return null
}
