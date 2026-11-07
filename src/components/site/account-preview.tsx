import { getLocale, getTranslations } from "@/lib/i18n/server"
import {
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Wallet,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Plus,
    Settings2,
    Repeat2,
    CalendarRange,
    Coffee,
    House,
    ShoppingBag,
    LayoutDashboard,
    Layers,
    Sun,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import styles from "./account-preview.module.css"

const wallets = [
    { name: "Bank", amount: "2,940 €" },
    { name: "Savings", amount: "9,600 €" },
    { name: "Cash", amount: "300 €" },
]

async function PreviewToolbar({ phone = false }: { phone?: boolean }) {
    const t = await getTranslations()

    return (
        <div className={styles.toolbar}>
            <div>
                <span className={styles.label}>{t("Account")}</span>
                <span className="mt-1 flex items-center gap-3 font-semibold">
                    {t("Personal")}{" "}
                    <ChevronDown className="size-3" aria-hidden="true" />
                </span>
            </div>
            {!phone && (
                <span className={styles.activeTab}>{t("Overview")}</span>
            )}
            <div
                className="ml-auto flex items-center gap-3 text-muted-foreground"
                aria-hidden="true"
            >
                <Sun className="size-3.5" />
                <Settings2 className="size-3.5" />
            </div>
        </div>
    )
}

async function PreviewBalances() {
    const locale = await getLocale()
    const t = await getTranslations()

    return (
        <>
            <div className={styles.balance}>
                <p>{t("Total balance")}</p>
                <strong>
                    {locale === "el" ? "12.840,00 €" : "12,840.00 €"}
                </strong>
                <span>{t("Current posted balance")}</span>
            </div>
            <div className={styles.wallets}>
                {wallets.map(({ name, amount }) => (
                    <div key={name}>
                        <Wallet
                            className="size-3.5 text-primary"
                            aria-hidden="true"
                        />
                        <span>{t(name)}</span>
                        <strong>
                            {locale === "el"
                                ? amount.replace(/,/g, ".")
                                : amount}
                        </strong>
                    </div>
                ))}
            </div>
        </>
    )
}

async function PreviewMonth() {
    const t = await getTranslations()

    return (
        <div className={styles.month}>
            <ChevronLeft className="size-3.5" aria-hidden="true" />
            <span>{t("November 2026")}</span>
            <ChevronRight className="size-3.5" aria-hidden="true" />
        </div>
    )
}

export async function AccountPreview() {
    const t = await getTranslations()

    return (
        <figure
            className={styles.browser}
            aria-label={t(
                "Sample CentScope account overview on a desktop browser"
            )}
        >
            <div className={styles.browserBar}>
                <span className={styles.browserDots} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                </span>
                <span>{t("CentScope / Personal")}</span>
                <span className="ml-auto">{t("Sample data")}</span>
            </div>
            <PreviewToolbar />
            <div className={styles.screen}>
                <PreviewBalances />
                <div className={styles.actions} aria-hidden="true">
                    <span>
                        <Plus className="size-3" /> {t("Add transaction")}
                    </span>
                    <span>
                        {t("Transactions")} <ArrowUpRight className="size-3" />
                    </span>
                </div>
                <div className="mt-5 mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">
                        {t("Monthly overview")}
                    </p>
                    <span className="text-[10px] text-primary">
                        {t("Detailed analysis →")}
                    </span>
                </div>
                <PreviewMonth />
                <div className={styles.stats}>
                    {[
                        {
                            label: t("Income"),
                            amount: "3,250 €",
                            flow: "income",
                            icon: ArrowDownLeft,
                        },
                        {
                            label: t("Expenses"),
                            amount: "2,480 €",
                            flow: "expense",
                            icon: ArrowUpRight,
                        },
                        {
                            label: t("Net"),
                            amount: "+770 €",
                            flow: "income",
                            icon: ArrowLeftRight,
                        },
                    ].map(({ label, amount, flow, icon: Icon }) => (
                        <div key={t(label || "")}>
                            <span>
                                <Icon className="size-3" aria-hidden="true" />
                                {t(label || "")}
                            </span>
                            <strong data-flow={flow}>{amount}</strong>
                        </div>
                    ))}
                </div>
                <div className={styles.categories}>
                    <p className="mb-3 text-xs font-semibold">
                        {t("Categories Overview")}
                    </p>
                    {[
                        { name: "Housing", amount: "850 €", width: "34.3%" },
                        {
                            name: "Food & drink",
                            amount: "430 €",
                            width: "17.3%",
                        },
                        {
                            name: "Insurance",
                            amount: "1,200 €",
                            width: "48.4%",
                        },
                    ].map(({ name, amount, width }) => (
                        <div key={name}>
                            <p>
                                <span>{t(name)}</span>
                                <span data-flow="expense">{amount}</span>
                            </p>
                            <div className={styles.track}>
                                <div style={{ width }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </figure>
    )
}

export async function PhonePreview() {
    const t = await getTranslations()

    return (
        <figure
            className={styles.phone}
            aria-label={t("Sample CentScope transactions in a mobile browser")}
        >
            <div className={styles.phoneStatus} aria-hidden="true">
                <span>9:41</span>
                <span className={styles.notch} />
                <span>••• ▰</span>
            </div>
            <PreviewToolbar phone />
            <div className={styles.phoneScreen}>
                <PreviewBalances />
                <div className="mt-4 mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">{t("Transactions")}</p>
                    <span className="text-[10px] text-muted-foreground">
                        {t("Sample data")}
                    </span>
                </div>
                <PreviewMonth />
                <div className="my-3 flex gap-1.5 text-[10px]">
                    <span className={styles.activeTab}>{t("Month")}</span>
                    <span className="px-3 py-1.5 text-muted-foreground">
                        {t("Year")}
                    </span>
                    <span className="px-3 py-1.5 text-muted-foreground">
                        {t("Period")}
                    </span>
                </div>
                <p className="mb-1 text-[10px] text-muted-foreground">
                    {t("4 November")}
                </p>
                {[
                    {
                        name: "Rent",
                        detail: "Bank · Housing",
                        amount: "−850.00 €",
                        icon: House,
                        recurring: true,
                    },
                    {
                        name: "Annual insurance",
                        detail: "Bank · Insurance",
                        amount: "−1,200.00 €",
                        icon: ShoppingBag,
                        spread: true,
                    },
                    {
                        name: "Morning coffee",
                        detail: "Cash · Food & drink",
                        amount: "−3.50 €",
                        icon: Coffee,
                    },
                ].map(
                    ({
                        name,
                        detail,
                        amount,
                        icon: Icon,
                        recurring,
                        spread,
                    }) => (
                        <div key={name} className={styles.transaction}>
                            <div className="flex items-center gap-2">
                                <span className={styles.transactionIcon}>
                                    <Icon
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-medium">
                                        {t(name)}
                                    </p>
                                    <p className="mt-1 text-[9px] text-muted-foreground">
                                        {detail}
                                    </p>
                                </div>
                                <strong
                                    className="text-[11px] tabular-nums"
                                    data-flow="expense"
                                >
                                    {amount}
                                </strong>
                            </div>
                            <div className="mt-2 flex min-h-5 items-center justify-between gap-2">
                                {recurring ? (
                                    <Badge
                                        variant="secondary"
                                        className="text-[9px]"
                                    >
                                        <Repeat2 data-icon="inline-start" />
                                        {t("Recurring")}
                                    </Badge>
                                ) : spread ? (
                                    <Badge
                                        variant="secondary"
                                        className="text-[9px]"
                                    >
                                        <CalendarRange data-icon="inline-start" />
                                        {t("Spread · 12 mo")}
                                    </Badge>
                                ) : (
                                    <span />
                                )}
                                <span
                                    className={styles.statusSwitch}
                                    role="img"
                                    aria-label={t("Posted")}
                                >
                                    <span />
                                </span>
                            </div>
                        </div>
                    )
                )}
                <div className={styles.phoneAdd} aria-hidden="true">
                    <Plus className="size-3.5" /> {t("Add transaction")}
                </div>
            </div>
            <div className={styles.bottomNav} aria-hidden="true">
                <span>
                    <LayoutDashboard />
                    {t("Overview")}
                </span>
                <span className="text-primary">
                    <ArrowLeftRight />
                    {t("Transactions")}
                </span>
                <span>
                    <Layers />
                    {t("Accounts")}
                </span>
            </div>
            <div className={styles.homeIndicator} aria-hidden="true" />
        </figure>
    )
}

export async function WalletStructure() {
    const locale = await getLocale()
    const t = await getTranslations()

    return (
        <div className={styles.structure}>
            <div className="flex items-center justify-between gap-3 border-b pb-4">
                <div>
                    <p className="text-xs text-muted-foreground">
                        {t("One financial account")}
                    </p>
                    <p className="mt-1 font-semibold">{t("Personal")}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                        {t("Combined balance")}
                    </p>
                    <p className="mt-1 font-semibold tabular-nums">12,840 €</p>
                </div>
            </div>
            <div className={styles.wallets}>
                {wallets.map(({ name, amount }) => (
                    <div key={name}>
                        <Wallet
                            className="size-4 text-primary"
                            aria-hidden="true"
                        />
                        <span>{t(name)}</span>
                        <strong>
                            {locale === "el"
                                ? amount.replace(/,/g, ".")
                                : amount}
                        </strong>
                    </div>
                ))}
            </div>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
                {t("Separate wallet balances. One overview of your money.")}
            </p>
        </div>
    )
}

export async function SpreadExample() {
    const t = await getTranslations()

    return (
        <div className={styles.spread}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                <div>
                    <p className="text-xs text-muted-foreground">
                        {t("Annual insurance")}
                    </p>
                    <p className="mt-1 font-semibold">
                        {t("1,200 € paid once")}
                    </p>
                </div>
                <Badge variant="secondary">
                    <CalendarRange data-icon="inline-start" />
                    {t("Spread · 12 mo")}
                </Badge>
            </div>
            <div className={styles.spreadMonths}>
                {[t("Nov"), t("Dec"), t("Jan")].map((month) => (
                    <div key={month}>
                        <span>{month}</span>
                        <div />
                        <strong>100 €</strong>
                    </div>
                ))}
                <div className={styles.remainingMonths}>
                    <span>+9</span>
                    <p>{t("more months")}</p>
                </div>
            </div>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
                {t(
                    "100 € per month in smoothed analysis. The original 1,200 € payment stays recorded once."
                )}
            </p>
        </div>
    )
}
