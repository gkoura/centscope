import Link from "next/link"
import { notFound } from "next/navigation"
import { PlusIcon, UploadIcon, ReceiptTextIcon } from "lucide-react"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { listOwnedAccountWallets } from "@/lib/wallets"
import { listOwnedAccountCategories } from "@/lib/categories"
import { listOwnedAccountTransactions } from "@/lib/transactions"
import {
    parseTransactionFilters,
    type TransactionQuery,
} from "@/lib/transaction-filters"
import { formatWalletMoney } from "@/lib/wallet-input"
import { TransactionActions } from "@/components/financial-accounts/transaction-actions"
import { TransactionStatusForm } from "@/components/financial-accounts/transaction-status-form"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
type AccountParams = Promise<{ id: string }>

function FilterSelect({
    name,
    label,
    value,
    options,
}: {
    name: string
    label: string
    value?: string
    options: { id: string; name: string }[]
}) {
    return (
        <Field>
            <FieldLabel htmlFor={`filter-${name}`}>{label}</FieldLabel>
            <select
                id={`filter-${name}`}
                name={name}
                defaultValue={value ?? ""}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
            >
                <option value="">All</option>
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
        </Field>
    )
}

export async function TransactionWorkspace({
    params,
    searchParams,
    full = false,
}: {
    params: AccountParams
    searchParams: Promise<TransactionQuery>
    full?: boolean
}) {
    const { id } = await params
    const account = await getOwnedFinancialAccount(id)
    if (!account) notFound()
    const query = await searchParams
    const before = typeof query.before === "string" ? query.before : undefined
    const filters = parseTransactionFilters(query)
    const basePath = `/dashboard/accounts/${account.id}/transactions`
    const [wallets, categories, history] = await Promise.all([
        listOwnedAccountWallets(account.id),
        listOwnedAccountCategories(account.id),
        listOwnedAccountTransactions(account.id, before, full ? filters : {}),
    ])
    const pageHref = (cursor?: string) => {
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(filters))
            if (full && value) params.set(key, value)
        if (cursor) params.set("before", cursor)
        return `${full ? basePath : `/dashboard/accounts/${account.id}`}?${params.toString()}`
    }
    const activeFilters = Object.values(filters).some(Boolean)
    return (
        <section
            aria-labelledby="transactions-heading"
            className="flex min-w-0 flex-col gap-4"
        >
            {full && (
                <Link
                    href={`/dashboard/accounts/${account.id}`}
                    className="text-sm underline underline-offset-4"
                >
                    Back to account
                </Link>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 id="transactions-heading" className="text-lg font-semibold">
                    {full ? account.name : "Transactions"}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        render={
                            <Link
                                href={`/dashboard/accounts/${account.id}/analysis`}
                            />
                        }
                        nativeButton={false}
                    >
                        Monthly analysis
                    </Button>
                    {!full && (
                        <Button
                            variant="ghost"
                            render={<Link href={basePath} />}
                            nativeButton={false}
                        >
                            View all
                        </Button>
                    )}
                    {wallets.length > 0 && (
                        <>
                            <Button
                                variant="outline"
                                render={<Link href={`${basePath}/import`} />}
                                nativeButton={false}
                            >
                                <UploadIcon data-icon="inline-start" />
                                Import CSV
                            </Button>
                            <Button
                                render={<Link href={`${basePath}/new`} />}
                                nativeButton={false}
                            >
                                <PlusIcon data-icon="inline-start" />
                                Add transaction
                            </Button>
                        </>
                    )}
                </div>
            </div>
            {full && (
                <form
                    key={JSON.stringify(filters)}
                    action={basePath}
                    className="rounded-xl border bg-card p-4"
                >
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="filter-q">
                                Search transactions
                            </FieldLabel>
                            <Input
                                id="filter-q"
                                name="q"
                                defaultValue={filters.q}
                                placeholder="Search names and notes…"
                                maxLength={120}
                            />
                        </Field>
                    </FieldGroup>
                    <details
                        className="mt-4"
                        open={Boolean(
                            filters.type ||
                            filters.status ||
                            filters.wallet ||
                            filters.category ||
                            filters.from ||
                            filters.to
                        )}
                    >
                        <summary className="cursor-pointer text-sm font-medium">
                            Filters · type, status, wallet, category & dates
                        </summary>
                        <FieldGroup className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
                            <FilterSelect
                                name="type"
                                label="Type"
                                value={filters.type}
                                options={[
                                    { id: "EXPENSE", name: "Expenses" },
                                    { id: "INCOME", name: "Income" },
                                    {
                                        id: "OPENING_BALANCE",
                                        name: "Opening balances",
                                    },
                                ]}
                            />
                            <FilterSelect
                                name="status"
                                label="Status"
                                value={filters.status}
                                options={[
                                    { id: "POSTED", name: "Posted" },
                                    { id: "PENDING", name: "Pending" },
                                ]}
                            />
                            <FilterSelect
                                name="wallet"
                                label="Wallet"
                                value={filters.wallet}
                                options={wallets.map((wallet) => ({
                                    id: wallet.id,
                                    name: `${wallet.name} (${wallet.currency})`,
                                }))}
                            />
                            <FilterSelect
                                name="category"
                                label="Category"
                                value={filters.category}
                                options={categories.map((category) => ({
                                    id: category.id,
                                    name: `${category.parentId ? `${categories.find((parent) => parent.id === category.parentId)?.name} / ` : ""}${category.name}`,
                                }))}
                            />
                            <Field>
                                <FieldLabel htmlFor="filter-from">
                                    From
                                </FieldLabel>
                                <Input
                                    id="filter-from"
                                    name="from"
                                    type="date"
                                    defaultValue={filters.from}
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="filter-to">To</FieldLabel>
                                <Input
                                    id="filter-to"
                                    name="to"
                                    type="date"
                                    defaultValue={filters.to}
                                />
                            </Field>
                        </FieldGroup>
                    </details>
                    <div className="mt-4 flex items-center gap-3">
                        <Button type="submit" variant="secondary">
                            Apply filters
                        </Button>
                        {activeFilters && (
                            <Link
                                href={basePath}
                                className="text-sm underline underline-offset-4"
                            >
                                Clear filters
                            </Link>
                        )}
                    </div>
                </form>
            )}

            {history.transactions.length ? (
                <div className="overflow-hidden rounded-xl border bg-card">
                    <Table className="block sm:table">
                        <TableCaption className="block w-full px-4 py-3 text-left sm:table-caption">
                            Showing {history.transactions.length} transactions,
                            newest date first. Only posted entries affect
                            balances.
                        </TableCaption>
                        <TableHeader className="hidden sm:table-header-group">
                            <TableRow>
                                <TableHead scope="col">Date & name</TableHead>
                                <TableHead scope="col">Category</TableHead>
                                <TableHead scope="col">
                                    Wallet & amount
                                </TableHead>
                                <TableHead scope="col">Status</TableHead>
                                <TableHead scope="col">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="block sm:table-row-group">
                            {history.transactions.map((transaction) => (
                                <TableRow
                                    key={transaction.id}
                                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-4 sm:table-row sm:p-0"
                                >
                                    <TableCell className="order-1 max-w-64 p-0 whitespace-normal sm:p-2">
                                        <p className="text-xs text-muted-foreground">
                                            {transaction.date} ·{" "}
                                            {transaction.type === "EXPENSE"
                                                ? "Expense"
                                                : transaction.type === "INCOME"
                                                  ? "Income"
                                                  : "Opening balance"}
                                        </p>
                                        <p className="font-medium break-words">
                                            {transaction.canChangeStatus &&
                                            (transaction.type === "EXPENSE" ||
                                                transaction.type ===
                                                    "INCOME") ? (
                                                <Link
                                                    href={`${basePath}/${transaction.id}/edit`}
                                                    aria-label={`Edit ${transaction.name}`}
                                                    className="underline decoration-border underline-offset-4 hover:decoration-current"
                                                >
                                                    {transaction.name}
                                                </Link>
                                            ) : (
                                                transaction.name
                                            )}
                                        </p>
                                        {transaction.expenseSpread && (
                                            <Badge variant="secondary">
                                                Spread across{" "}
                                                {
                                                    transaction.expenseSpread
                                                        .monthCount
                                                }{" "}
                                                months
                                            </Badge>
                                        )}
                                        {transaction.notes ? (
                                            <details className="mt-2 text-sm">
                                                <summary className="cursor-pointer text-muted-foreground">
                                                    Notes
                                                </summary>
                                                <p className="mt-1 break-words whitespace-pre-wrap">
                                                    {transaction.notes}
                                                </p>
                                            </details>
                                        ) : null}
                                    </TableCell>
                                    <TableCell className="order-3 col-span-2 max-w-48 p-0 break-words whitespace-normal sm:p-2">
                                        {transaction.category ?? "—"}
                                    </TableCell>
                                    <TableCell className="order-2 p-0 text-right sm:p-2">
                                        <p className="max-w-48 break-words whitespace-normal text-muted-foreground">
                                            {transaction.walletName}
                                        </p>
                                        <p className="tabular-nums">
                                            {formatWalletMoney(
                                                transaction.amount,
                                                transaction.currency
                                            )}
                                        </p>
                                    </TableCell>
                                    <TableCell className="order-4 col-span-2 p-0 pt-2 sm:p-2">
                                        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-start">
                                            <Badge
                                                variant={
                                                    transaction.status ===
                                                    "POSTED"
                                                        ? "secondary"
                                                        : "outline"
                                                }
                                            >
                                                {transaction.status === "POSTED"
                                                    ? "Posted"
                                                    : "Pending"}
                                            </Badge>
                                            {transaction.canChangeStatus ? (
                                                <TransactionStatusForm
                                                    key={`${transaction.id}-${transaction.version}`}
                                                    financialAccountId={
                                                        account.id
                                                    }
                                                    transactionId={
                                                        transaction.id
                                                    }
                                                    name={transaction.name}
                                                    status={transaction.status}
                                                    version={
                                                        transaction.version
                                                    }
                                                />
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell className="order-5 col-span-2 p-0 pt-2 sm:p-2">
                                        {transaction.canChangeStatus &&
                                        (transaction.type === "EXPENSE" ||
                                            transaction.type === "INCOME") ? (
                                            <TransactionActions
                                                key={`${transaction.id}-${transaction.version}`}
                                                financialAccountId={account.id}
                                                transaction={transaction}
                                            />
                                        ) : (
                                            <span className="text-muted-foreground">
                                                —
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
                    <ReceiptTextIcon
                        aria-hidden="true"
                        className="size-8 text-muted-foreground"
                    />
                    <h3 className="font-medium">
                        {activeFilters
                            ? "No matching transactions"
                            : before
                              ? "No older transactions"
                              : "Your transactions start here"}
                    </h3>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        {activeFilters
                            ? "Try another search or clear your filters."
                            : "Record an expense, add income, or import your history from a CSV."}
                    </p>
                </div>
            )}
            <nav
                aria-label="Transaction history pages"
                className="flex flex-wrap gap-4 text-sm"
            >
                {before ? (
                    <Link
                        href={pageHref()}
                        className="underline underline-offset-4"
                    >
                        Newest transactions
                    </Link>
                ) : null}
                {history.nextCursor ? (
                    <Link
                        href={pageHref(history.nextCursor)}
                        className="underline underline-offset-4"
                    >
                        Older transactions
                    </Link>
                ) : null}
            </nav>
        </section>
    )
}
