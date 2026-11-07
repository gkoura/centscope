import Link from "next/link"
import {
    ArrowRight,
    CalendarClock,
    CheckCheck,
    CircleAlert,
    Clock3,
    Repeat2,
    TriangleAlert,
} from "lucide-react"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatWalletMoney } from "@/lib/wallet-input"
import {
    pendingPaymentsHref,
    type summarizePendingPayments,
} from "@/lib/pending-payments"
import { cn } from "@/lib/utils"

const dateLabel = (date: string) =>
    new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`))

export function PendingPayments({
    accountId,
    summary,
}: {
    accountId: string
    summary: ReturnType<typeof summarizePendingPayments>
}) {
    const href = pendingPaymentsHref(accountId, summary)
    return (
        <Card
            role="region"
            aria-labelledby="pending-payments-heading"
            className={cn(
                "gap-0 py-0",
                summary.overdue > 0 && "ring-expense/30"
            )}
        >
            <CardHeader className="gap-3 px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
                            <CalendarClock
                                className="size-4 text-primary"
                                aria-hidden="true"
                            />
                        </span>
                        <CardTitle>
                            <h2 id="pending-payments-heading">
                                Pending payments
                            </h2>
                        </CardTitle>
                        {summary.count > 0 && (
                            <Badge variant="secondary">{summary.count}</Badge>
                        )}
                    </div>
                    {summary.count > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {summary.overdue > 0 && (
                                <Badge variant="overdue">
                                    <CircleAlert data-icon="inline-start" />
                                    {summary.overdue} overdue
                                </Badge>
                            )}
                            {summary.dueToday > 0 && (
                                <Badge variant="warning">
                                    <TriangleAlert data-icon="inline-start" />
                                    {summary.dueToday} due today
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
                <CardDescription>
                    Pending expenses, ordered by due date. Their scheduled
                    transaction date is treated as the due date.
                </CardDescription>
                {summary.count > 0 && (
                    <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-xl bg-muted/40 px-4 py-3">
                        {summary.totals.map((total) => (
                            <div key={total.currency} className="min-w-0">
                                <p className="text-xs text-muted-foreground">
                                    Pending total
                                </p>
                                <p className="mt-1 text-lg font-semibold [overflow-wrap:anywhere] tabular-nums">
                                    {formatWalletMoney(
                                        total.amount,
                                        total.currency
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardHeader>
            <CardContent className="px-0">
                {summary.count ? (
                    <ul className="divide-y border-t">
                        {summary.items.map((payment) => {
                            const overdue = payment.due.state === "overdue",
                                dueToday = payment.due.state === "today"
                            const Icon = overdue
                                ? CircleAlert
                                : dueToday
                                  ? TriangleAlert
                                  : Clock3
                            return (
                                <li key={payment.id}>
                                    <Link
                                        href={`/dashboard/accounts/${accountId}/transactions/${payment.transactionId}/edit?${new URLSearchParams({ returnTo: href })}`}
                                        className={cn(
                                            "group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:flex-row sm:items-center sm:justify-between",
                                            overdue && "bg-expense/5"
                                        )}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium wrap-break-word">
                                                    {payment.name}
                                                </p>
                                                {payment.recurring && (
                                                    <Badge variant="outline">
                                                        <Repeat2 data-icon="inline-start" />
                                                        Repeats
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                <span className="wrap-break-word">
                                                    {payment.walletName}
                                                </span>{" "}
                                                ·{" "}
                                                <time dateTime={payment.date}>
                                                    {dateLabel(payment.date)}
                                                </time>
                                            </p>
                                        </div>
                                        <div className="flex min-w-0 items-center justify-between gap-3 sm:max-w-[50%] sm:justify-end">
                                            <Badge
                                                variant={
                                                    overdue
                                                        ? "overdue"
                                                        : dueToday
                                                          ? "warning"
                                                          : "outline"
                                                }
                                            >
                                                <Icon data-icon="inline-start" />
                                                {payment.due.label}
                                            </Badge>
                                            <span
                                                className="min-w-0 text-right text-sm font-semibold [overflow-wrap:anywhere] tabular-nums"
                                                data-flow="expense"
                                            >
                                                {formatWalletMoney(
                                                    payment.amount,
                                                    payment.currency
                                                )}
                                            </span>
                                            <ArrowRight
                                                className="size-4 shrink-0 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <div className="flex items-start gap-3 border-t px-5 py-6">
                        <CheckCheck
                            className="mt-0.5 size-5 shrink-0 text-primary"
                            aria-hidden="true"
                        />
                        <div>
                            <p className="text-sm font-medium">
                                No pending payments
                            </p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                You’re all caught up. Expenses marked as pending
                                will appear here.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
            {summary.count > 0 && (
                <CardFooter className="flex-wrap justify-between gap-2 px-5 py-3">
                    <p className="text-xs text-muted-foreground">
                        {summary.count > summary.items.length
                            ? `Showing the next ${summary.items.length} of ${summary.count} payments`
                            : "Pending payments don’t affect your balance."}
                    </p>
                    <Button
                        variant="ghost"
                        className="min-h-11"
                        nativeButton={false}
                        render={<Link href={href} />}
                    >
                        View all pending
                        <ArrowRight data-icon="inline-end" />
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
