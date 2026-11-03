import {
    ArrowDownLeft,
    ArrowUpRight,
    House,
    Wallet,
    Coffee,
    ShoppingBag,
    Plus,
} from "lucide-react"

export function AccountPreview() {
    return (
        <div
            className="account-preview"
            aria-label="Illustrative financial account preview"
        >
            <div className="flex items-center justify-between border-b pb-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Wallet className="size-4" />
                    </span>
                    Personal account
                </div>
                <span className="text-xs text-muted-foreground">
                    Example overview
                </span>
            </div>
            <div className="flex items-end justify-between gap-3 py-7">
                <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                        A clearer picture of your money
                    </p>
                    <p className="text-4xl font-medium tracking-tighter tabular-nums">
                        €12,840
                        <span className="text-muted-foreground">.00</span>
                    </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    EUR
                </span>
            </div>
            <div className="preview-chart" aria-hidden="true">
                <svg viewBox="0 0 500 135" preserveAspectRatio="none">
                    <defs>
                        <linearGradient
                            id="chart-fill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor="currentColor"
                                stopOpacity=".18"
                            />
                            <stop
                                offset="100%"
                                stopColor="currentColor"
                                stopOpacity="0"
                            />
                        </linearGradient>
                    </defs>
                    <path
                        d="M0 110 C25 110 25 90 50 95 S90 115 115 82 S150 100 180 69 S220 90 250 57 S290 70 320 40 S350 59 380 25 S420 46 450 14 S480 25 500 3 V135 H0Z"
                        fill="url(#chart-fill)"
                    />
                    <path
                        d="M0 110 C25 110 25 90 50 95 S90 115 115 82 S150 100 180 69 S220 90 250 57 S290 70 320 40 S350 59 380 25 S420 46 450 14 S480 25 500 3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                    />
                </svg>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="preview-stat">
                    <ArrowDownLeft className="size-4 text-primary" />
                    <span>
                        Money in<strong>€3,250.00</strong>
                    </span>
                </div>
                <div className="preview-stat">
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                    <span>
                        Money out<strong>€1,480.00</strong>
                    </span>
                </div>
            </div>
            <div className="mt-7 flex items-center justify-between">
                <p className="text-sm font-medium">Everyday, in perspective</p>
                <span className="text-xs text-muted-foreground">
                    Sample activity
                </span>
            </div>
            <div className="mt-3">
                {[
                    {
                        icon: House,
                        name: "Home",
                        detail: "A place for the essentials",
                        amount: "€850.00",
                    },
                    {
                        icon: ShoppingBag,
                        name: "Groceries",
                        detail: "The everyday things",
                        amount: "€64.80",
                    },
                    {
                        icon: Coffee,
                        name: "Coffee & a catch-up",
                        detail: "The little things, too",
                        amount: "€8.50",
                    },
                ].map(({ icon: Icon, name, detail, amount }) => (
                    <div
                        key={name}
                        className="flex items-center gap-3 border-b py-3 last:border-0"
                    >
                        <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
                            <Icon className="size-4 text-muted-foreground" />
                        </span>
                        <div className="flex-1">
                            <p className="text-xs font-medium">{name}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                                {detail}
                            </p>
                        </div>
                        <span className="text-xs font-medium tabular-nums">
                            −{amount}
                        </span>
                    </div>
                ))}
            </div>
            <div className="preview-floating">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Plus className="size-4" />
                </span>
                <div>
                    <p className="text-xs font-medium">
                        Life has different pockets.
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                        Give each one a place.
                    </p>
                </div>
            </div>
        </div>
    )
}
