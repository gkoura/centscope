import { getTranslations } from "@/lib/i18n/server"
import { Suspense } from "react"
import Link from "@/components/i18n/link"
import { headers } from "next/headers"
import { redirectLocalized as redirect } from "@/lib/i18n/server-navigation"
import { auth } from "@/lib/auth"
import {
    ArrowRight,
    Check,
    Wallet,
    CalendarRange,
    Monitor,
    Smartphone,
    ArrowUpRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import {
    AccountPreview,
    PhonePreview,
    WalletStructure,
    SpreadExample,
} from "@/components/site/account-preview"

export default async function Page() {
    const t = await getTranslations()

    return (
        <>
            <Suspense fallback={null}>
                <SessionRedirect />
            </Suspense>
            <SiteHeader />
            <main id="main-content">
                <section className="site-width hero-grid overflow-clip">
                    <div className="hero-copy min-w-0">
                        <p className="eyebrow">
                            <span className="size-1.5 rounded-full bg-primary" />{" "}
                            {t("LESS GUESSWORK. MORE CLARITY.")}
                        </p>
                        <h1>
                            {t("Make sense")}
                            <br />
                            <span className="text-primary">
                                {t("of every cent.")}
                            </span>
                        </h1>
                        <p className="hero-description">
                            {t(
                                "Your bank, savings, and cash. One clear picture. Keep multiple wallets in one financial account, track everyday spending, and see what each month really costs."
                            )}
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                            <Button
                                size="lg"
                                className="h-12 px-6"
                                render={<Link href="/auth/sign-up" />}
                                nativeButton={false}
                            >
                                {t("Create your account")}{" "}
                                <ArrowRight data-icon="inline-end" />
                            </Button>
                            <a
                                href="#how-it-works"
                                className="inline-flex items-center gap-2 px-2 py-3 text-sm font-medium"
                            >
                                {t("Take a closer look")}{" "}
                                <ArrowUpRight className="size-4" />
                            </a>
                        </div>
                        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="size-3.5 shrink-0 text-primary" />
                            {t(
                                "Made for your browser. Just as good on your phone."
                            )}
                        </p>
                    </div>
                    <div className="hero-visual min-w-0">
                        <div className="visual-orbit" />
                        <AccountPreview />
                        <span className="visual-caption">
                            {t(
                                "Your account overview · illustrative sample data"
                            )}
                        </span>
                    </div>
                </section>
                <section
                    id="features"
                    className="scroll-mt-6 border-y bg-muted/35"
                >
                    <div className="site-width py-16 md:py-24">
                        <div className="mb-12 max-w-2xl">
                            <p className="eyebrow">
                                {t("A DIFFERENT WAY TO SEE YOUR MONEY")}
                            </p>
                            <h2 className="section-title">
                                {t("Built around real life.")}
                                <br />
                                {t("Not just a list of transactions.")}
                            </h2>
                            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                                {t(
                                    "Where you keep your money and when you pay for something shouldn’t make the bigger picture harder to understand. Here’s how CentScope brings it together."
                                )}
                            </p>
                        </div>
                        <div className="grid items-start gap-10 md:grid-cols-2 md:gap-12">
                            <article className="feature-item min-w-0">
                                <div className="mb-6 flex items-center justify-between">
                                    <Wallet
                                        className="size-6 text-primary"
                                        strokeWidth={1.5}
                                        aria-hidden="true"
                                    />
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {t("01 / ORGANIZE")}
                                    </span>
                                </div>
                                <h3 className="text-xl font-medium tracking-tight">
                                    {t("One account. Multiple wallets.")}
                                </h3>
                                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                                    {t(
                                        "Your bank account, savings, and cash don’t need to be separate financial accounts in the app. Add them as wallets inside one Personal account. See each balance and the combined total, with all their transactions in one place."
                                    )}
                                </p>
                                <WalletStructure />
                                <p className="mt-4 text-xs leading-6 text-muted-foreground">
                                    {t(
                                        "Want a separate space for home or another purpose? Create another financial account and give it its own wallets."
                                    )}
                                </p>
                            </article>
                            <article className="feature-item min-w-0">
                                <div className="mb-6 flex items-center justify-between">
                                    <CalendarRange
                                        className="size-6 text-primary"
                                        strokeWidth={1.5}
                                        aria-hidden="true"
                                    />
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {t("02 / UNDERSTAND")}
                                    </span>
                                </div>
                                <h3 className="text-xl font-medium tracking-tight">
                                    {t(
                                        "Big payment. Smoother monthly analysis."
                                    )}
                                </h3>
                                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                                    {t(
                                        "Annual insurance or a big purchase can make one month look unusually expensive. Spread an expense across the months you choose to see a more useful view of its monthly cost."
                                    )}
                                </p>
                                <SpreadExample />
                                <p className="mt-4 text-xs leading-6 text-muted-foreground">
                                    {t(
                                        "Switch between actual payments and smoothed spending in analysis. Always know what left your wallet and what each month represents."
                                    )}
                                </p>
                            </article>
                        </div>
                    </div>
                </section>
                <section
                    aria-labelledby="every-screen-heading"
                    className="site-width grid items-center gap-12 py-20 md:grid-cols-2 md:gap-20 md:py-28"
                >
                    <div className="relative order-2 flex min-w-0 justify-center md:order-1">
                        <div
                            className="absolute inset-x-0 inset-y-16 rounded-[3rem] bg-muted/70"
                            aria-hidden="true"
                        />
                        <div className="relative w-full max-w-[310px]">
                            <PhonePreview />
                        </div>
                    </div>
                    <div className="order-1 min-w-0 md:order-2">
                        <p className="eyebrow">
                            <Monitor className="size-4" aria-hidden="true" />
                            <Smartphone
                                className="size-4"
                                aria-hidden="true"
                            />{" "}
                            {t("YOUR MONEY, ON EVERY SCREEN")}
                        </p>
                        <h2 id="every-screen-heading" className="section-title">
                            {t("At your desk.")}
                            <br />
                            {t("Out living life.")}
                        </h2>
                        <p className="mt-5 text-sm leading-7 text-muted-foreground">
                            {t(
                                "A clear overview in your desktop browser. An experience designed for your thumbs on your phone. CentScope fits both, with the same accounts, wallets, and transactions. Just open it in your browser."
                            )}
                        </p>
                        <ul className="mt-7 flex flex-col gap-5">
                            {[
                                [
                                    t("Record it while it’s fresh"),
                                    t(
                                        "Add an expense on your phone, choose its wallet and category, and carry on with your day."
                                    ),
                                ],
                                [
                                    t("Find the transactions that matter"),
                                    t(
                                        "Browse by month, year, or a custom period. Combine wallet filters to see exactly what you need."
                                    ),
                                ],
                                [
                                    t("Stay in the flow"),
                                    t(
                                        "Switch accounts, move between months, and mark transactions posted or pending right from the list."
                                    ),
                                ],
                            ].map(([title, text]) => (
                                <li key={title} className="flex gap-3">
                                    <Check
                                        className="mt-1 size-4 shrink-0 text-primary"
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <h3 className="text-sm font-semibold">
                                            {title}
                                        </h3>
                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                            {text}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-6 text-xs text-muted-foreground">
                            {t(
                                "Light or dark mode. Desktop or mobile browser. Your choice."
                            )}
                        </p>
                    </div>
                </section>
                <section
                    id="how-it-works"
                    className="site-width grid gap-12 py-20 md:grid-cols-2 md:py-28"
                >
                    <div>
                        <p className="eyebrow">
                            {t("START SMALL. SEE CLEARER.")}
                        </p>
                        <h2 className="section-title">
                            {t("A fresh perspective,")}
                            <br />
                            {t("in a few simple steps.")}
                        </h2>
                        <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
                            {t(
                                "Start with the money you have today. Build a clearer picture with every transaction you add."
                            )}
                        </p>
                    </div>
                    <ol className="flex flex-col gap-8">
                        {[
                            [
                                t("Create your financial account"),
                                t(
                                    "Sign up, create a Personal account, and choose its reporting currency."
                                ),
                            ],
                            [
                                t("Add your wallets"),
                                t(
                                    "Give your bank, savings, and cash their own wallets, with a starting balance for each."
                                ),
                            ],
                            [
                                t("Track your day. Understand your month."),
                                t(
                                    "Record income and expenses, organize them by category, and use monthly analysis to see where your money goes."
                                ),
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
                            <p className="eyebrow">{t("YOUR NEXT CHAPTER")}</p>
                            <h2 className="section-title">
                                {t("Make room for a clearer tomorrow.")}
                            </h2>
                            <p className="mt-4 text-sm text-muted-foreground">
                                {t(
                                    "One account, your wallets, and a better understanding of every month."
                                )}
                            </p>
                        </div>
                        <Button
                            size="lg"
                            className="h-12 px-6"
                            render={<Link href="/auth/sign-up" />}
                            nativeButton={false}
                        >
                            {t("Get started")}{" "}
                            <ArrowRight data-icon="inline-end" />
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
    if (session) return redirect("/dashboard")

    return null
}
