import Link from "next/link"
import { notFound } from "next/navigation"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { listOwnedAccountWallets } from "@/lib/wallets"
import { listOwnedAccountTransactions } from "@/lib/transactions"
import { TransactionStatusForm } from "@/components/financial-accounts/transaction-status-form"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatWalletMoney, walletTypes } from "@/lib/wallet-input"
import { PlusIcon, WalletIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export default async function AccountPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ before?: string | string[] }>
}) {
    const [{ id }, query] = await Promise.all([params, searchParams])
    const account = await getOwnedFinancialAccount(id)
    if (!account) notFound()
    const before = typeof query.before === "string" ? query.before : undefined
    const [wallets, history] = await Promise.all([
        listOwnedAccountWallets(account.id),
        listOwnedAccountTransactions(account.id, before),
    ])
    return (
        <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 p-6 sm:p-10">
            <Link
                href="/dashboard"
                className="text-sm underline underline-offset-4"
            >
                Back to accounts
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle>
                        <h1 className="break-words">{account.name}</h1>
                    </CardTitle>
                    <CardDescription>
                        Reporting currency: {account.reportingCurrency}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-start gap-4">
                    <Badge variant="secondary">Owner</Badge>
                    <Link
                        href={`/dashboard/accounts/${account.id}/categories`}
                        className="text-sm underline underline-offset-4"
                    >
                        Manage categories
                    </Link>
                    <p className="text-sm text-muted-foreground">
                        Keep track of the money you hold in bank accounts, cash,
                        and other wallets.
                    </p>
                </CardContent>
            </Card>
            <section
                aria-labelledby="wallets-heading"
                className="flex flex-col gap-4"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 id="wallets-heading" className="text-lg font-semibold">
                        Wallets
                    </h2>
                    {wallets.length ? (
                        <Button
                            render={
                                <Link
                                    href={`/dashboard/accounts/${account.id}/wallets/new`}
                                />
                            }
                            nativeButton={false}
                        >
                            <PlusIcon data-icon="inline-start" />
                            Add wallet
                        </Button>
                    ) : null}
                </div>
                {wallets.length ? (
                    <ul className="grid min-w-0 gap-4 sm:grid-cols-2">
                        {wallets.map((wallet) => (
                            <li key={wallet.id} className="min-w-0">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            <h3 className="break-words">
                                                {wallet.name}
                                            </h3>
                                        </CardTitle>
                                        <CardDescription>
                                            {
                                                walletTypes.find(
                                                    ({ value }) =>
                                                        value === wallet.type
                                                )?.label
                                            }{" "}
                                            · {wallet.currency}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-3">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-sm text-muted-foreground">
                                                Posted balance
                                            </p>
                                            <p className="text-xl font-semibold break-words tabular-nums">
                                                {formatWalletMoney(
                                                    wallet.balance,
                                                    wallet.currency
                                                )}
                                            </p>
                                        </div>
                                        {wallet.opening ? (
                                            <div className="flex flex-col items-start gap-2">
                                                <Badge variant="secondary">
                                                    {wallet.opening.status ===
                                                    "POSTED"
                                                        ? "Posted"
                                                        : "Pending"}{" "}
                                                    opening balance
                                                </Badge>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatWalletMoney(
                                                        wallet.opening.amount,
                                                        wallet.currency
                                                    )}{" "}
                                                    · {wallet.opening.date}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                Started at zero.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <Empty className="border py-10">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <WalletIcon />
                            </EmptyMedia>
                            <EmptyTitle>Add your first wallet</EmptyTitle>
                            <EmptyDescription>
                                Start with a bank account or the cash you keep
                                on hand.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                render={
                                    <Link
                                        href={`/dashboard/accounts/${account.id}/wallets/new`}
                                    />
                                }
                                nativeButton={false}
                            >
                                <PlusIcon data-icon="inline-start" />
                                Add wallet
                            </Button>
                        </EmptyContent>
                    </Empty>
                )}
            </section>
            <section
                aria-labelledby="transactions-heading"
                className="flex min-w-0 flex-col gap-4"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2
                        id="transactions-heading"
                        className="text-lg font-semibold"
                    >
                        Transactions
                    </h2>
                    {wallets.length ? (
                        <Button
                            render={
                                <Link
                                    href={`/dashboard/accounts/${account.id}/transactions/new`}
                                />
                            }
                            nativeButton={false}
                        >
                            <PlusIcon data-icon="inline-start" />
                            Add transaction
                        </Button>
                    ) : null}
                </div>
                {history.transactions.length ? (
                    <Table>
                        <TableCaption>
                            Up to 25 transactions, newest date first. Only
                            posted entries affect balances.
                        </TableCaption>
                        <TableHeader>
                            <TableRow>
                                <TableHead scope="col">Date & name</TableHead>
                                <TableHead scope="col">Category</TableHead>
                                <TableHead scope="col">
                                    Wallet & amount
                                </TableHead>
                                <TableHead scope="col">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.transactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell className="max-w-64 whitespace-normal">
                                        <p className="text-xs text-muted-foreground">
                                            {transaction.date} ·{" "}
                                            {transaction.type === "EXPENSE"
                                                ? "Expense"
                                                : transaction.type === "INCOME"
                                                  ? "Income"
                                                  : "Opening balance"}
                                        </p>
                                        <p className="font-medium break-words">
                                            {transaction.name}
                                        </p>
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
                                    <TableCell className="max-w-48 break-words whitespace-normal">
                                        {transaction.category ?? "—"}
                                    </TableCell>
                                    <TableCell>
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
                                    <TableCell>
                                        <div className="flex flex-col items-start gap-2">
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
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {before
                            ? "No older transactions."
                            : "No transactions yet. Add a wallet, then record an expense or income."}
                    </p>
                )}
                <nav
                    aria-label="Transaction history pages"
                    className="flex flex-wrap gap-4 text-sm"
                >
                    {before ? (
                        <Link
                            href={`/dashboard/accounts/${account.id}`}
                            className="underline underline-offset-4"
                        >
                            Newest transactions
                        </Link>
                    ) : null}
                    {history.nextCursor ? (
                        <Link
                            href={`/dashboard/accounts/${account.id}?before=${encodeURIComponent(history.nextCursor)}`}
                            className="underline underline-offset-4"
                        >
                            Older transactions
                        </Link>
                    ) : null}
                </nav>
            </section>
        </main>
    )
}
