"use client"

import Link from "next/link"
import { useMemo, useRef, useState, useTransition } from "react"
import { Download, FileUp, CheckCircle2 } from "lucide-react"
import {
    prepareTransactionImport,
    importTransactionBatch,
    finishTransactionImport,
} from "@/app/dashboard/accounts/[id]/transactions/actions"
import {
    MAX_IMPORT_BYTES,
    previewTransactionImport,
    sampleTransactionCsv,
    type ImportWallet,
    type ImportCategory,
} from "@/lib/transaction-import"
import {
    processImportPlan,
    importProgress,
    type ImportCheckpoint,
    type ImportProgress,
} from "@/lib/transaction-import-runner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table"

export function TransactionImport({
    financialAccountId,
    wallets,
    categories,
}: {
    financialAccountId: string
    wallets: ImportWallet[]
    categories: ImportCategory[]
}) {
    const [csv, setCsv] = useState("")
    const [filename, setFilename] = useState("")
    const [message, setMessage] = useState("")
    const [success, setSuccess] = useState(false)
    const [reading, setReading] = useState(false)
    const [pending, startTransition] = useTransition()
    const checkpoint = useRef<ImportCheckpoint | null>(null)
    const pause = useRef(false)
    const [pauseRequested, setPauseRequested] = useState(false)
    const [progress, setProgress] = useState<ImportProgress | null>(null)
    const preview = useMemo(
        () =>
            csv
                ? previewTransactionImport(
                      csv,
                      financialAccountId,
                      wallets,
                      categories
                  )
                : null,
        [csv, financialAccountId, wallets, categories]
    )
    async function runImport() {
        pause.current = false
        setPauseRequested(false)
        setMessage("")
        try {
            if (!checkpoint.current) {
                const prepared = await prepareTransactionImport({
                    financialAccountId,
                    csv,
                })
                if (!prepared.plan) {
                    setMessage(
                        prepared.message ?? "Unable to prepare this file."
                    )
                    return
                }
                checkpoint.current = {
                    plan: prepared.plan,
                    nextBatch: 0,
                    imported: 0,
                    skipped: 0,
                }
                setProgress(importProgress(checkpoint.current))
            }
            const done = await processImportPlan(
                checkpoint.current,
                importTransactionBatch,
                setProgress,
                () => pause.current
            )
            if (!done) {
                setMessage(
                    "Import paused. Completed batches are saved. Resume here, or upload this exact file later to continue safely."
                )
                return
            }
            const { imported, skipped } = checkpoint.current
            setSuccess(true)
            setMessage(
                `Import complete: ${imported} added, ${skipped} already imported and skipped.`
            )
        } catch (error) {
            const detail =
                error instanceof Error
                    ? error.message
                    : "The connection was interrupted."
            setMessage(
                `${detail} Completed batches remain saved. Resume to safely retry the unconfirmed batch.`
            )
        } finally {
            if (checkpoint.current) {
                try {
                    await finishTransactionImport(financialAccountId)
                } catch {
                    /* Import checkpoints do not depend on refreshing the UI. */
                }
            }
        }
    }
    function download() {
        const url = URL.createObjectURL(
            new Blob([sampleTransactionCsv], { type: "text/csv;charset=utf-8" })
        )
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = "centscope-transactions-sample.csv"
        anchor.click()
        URL.revokeObjectURL(url)
    }
    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>1. Prepare your CSV</CardTitle>
                    <CardDescription>
                        Download the sample, replace the example rows, and keep
                        the header unchanged.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                    <div>
                        <Button variant="outline" onClick={download}>
                            <Download data-icon="inline-start" />
                            Download sample CSV
                        </Button>
                    </div>
                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="font-medium">Date, type & amount</dt>
                            <dd className="mt-1 text-muted-foreground">
                                Dates: YYYY-MM-DD. Type: EXPENSE or INCOME.
                                Amount: positive, with a decimal point and up to
                                two decimal places. No currency symbols or
                                thousands separators.
                            </dd>
                        </div>
                        <div>
                            <dt className="font-medium">Wallet & currency</dt>
                            <dd className="mt-1 text-muted-foreground">
                                Use an existing wallet name. Each amount uses
                                that wallet’s currency. No currency conversion
                                is performed.
                            </dd>
                        </div>
                        <div>
                            <dt className="font-medium">
                                Category & subcategory
                            </dt>
                            <dd className="mt-1 text-muted-foreground">
                                Use existing category names of the matching
                                type. Subcategory is optional; leave its cell
                                empty when unused. Names are case-insensitive.
                            </dd>
                        </div>
                        <div>
                            <dt className="font-medium">Status & notes</dt>
                            <dd className="mt-1 text-muted-foreground">
                                Status: POSTED or PENDING. Posted transactions
                                affect balances immediately. Notes are optional.
                                Quote cells containing commas or line breaks.
                            </dd>
                        </div>
                    </dl>
                    <details className="rounded-lg border p-4 text-sm">
                        <summary className="cursor-pointer font-medium">
                            Your available wallet and category names
                        </summary>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <h3 className="font-medium">Wallets</h3>
                                <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
                                    {wallets.map((wallet) => (
                                        <li key={wallet.id}>
                                            {wallet.name} ({wallet.currency})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-medium">Categories</h3>
                                <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
                                    {categories.map((category) => (
                                        <li key={category.id}>
                                            {category.type}:{" "}
                                            {category.parentId
                                                ? `${categories.find((parent) => parent.id === category.parentId)?.name} / `
                                                : ""}
                                            {category.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <Link
                            className="mt-4 inline-block underline underline-offset-4"
                            href={`/dashboard/accounts/${financialAccountId}/categories`}
                        >
                            Manage categories
                        </Link>
                    </details>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>2. Upload & review</CardTitle>
                    <CardDescription>
                        UTF-8 CSV, up to 2,000 transactions and 2 MB. All rows
                        are checked first, then saved in batches of 50.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Field>
                        <FieldLabel htmlFor="transaction-csv">
                            CSV file
                        </FieldLabel>
                        <Input
                            id="transaction-csv"
                            type="file"
                            accept=".csv,text/csv"
                            disabled={pending || reading}
                            onChange={async (event) => {
                                const file = event.target.files?.[0]
                                setCsv("")
                                setMessage("")
                                setSuccess(false)
                                checkpoint.current = null
                                setProgress(null)
                                setPauseRequested(false)
                                setFilename(file?.name ?? "")
                                if (!file) return
                                if (file.size > MAX_IMPORT_BYTES) {
                                    setMessage(
                                        "Choose a CSV smaller than 2 MB."
                                    )
                                    return
                                }
                                setReading(true)
                                try {
                                    const contents = await file.text()
                                    if (!contents.trim())
                                        setMessage(
                                            "This file is empty. Add transaction rows using the sample template."
                                        )
                                    setCsv(contents)
                                } catch {
                                    setMessage(
                                        "We couldn’t read this file. Try choosing it again."
                                    )
                                } finally {
                                    setReading(false)
                                }
                            }}
                        />
                        <FieldDescription>
                            Nothing is saved until you confirm. Importing the
                            exact same file again skips its previously saved
                            rows; modified files are treated as new imports.
                        </FieldDescription>
                    </Field>
                    {!wallets.length && (
                        <p role="alert" className="text-sm text-destructive">
                            Add a wallet before importing transactions.
                        </p>
                    )}
                    {preview?.errors.length ? (
                        <div
                            role="alert"
                            className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
                        >
                            <p className="font-medium">
                                Fix {preview.errors.length}{" "}
                                {preview.errors.length === 1
                                    ? "issue"
                                    : "issues"}{" "}
                                in your CSV and upload it again.
                            </p>
                            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                                {preview.errors
                                    .slice(0, 20)
                                    .map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                            </ul>
                            {preview.errors.length > 20 && (
                                <p className="mt-2">
                                    Showing the first 20 issues.
                                </p>
                            )}
                        </div>
                    ) : null}
                    {preview?.rows.length ? (
                        <>
                            <p className="text-sm font-medium">
                                {filename} · {preview.rows.length} valid
                                transactions
                                {preview.errors.length
                                    ? " (import blocked until all issues are fixed)"
                                    : success
                                      ? " processed"
                                      : " ready to import"}
                            </p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Wallet</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">
                                            Amount
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.rows
                                        .slice(0, 10)
                                        .map((row, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    {row.date}
                                                </TableCell>
                                                <TableCell className="max-w-48 break-words whitespace-normal">
                                                    {row.name}
                                                </TableCell>
                                                <TableCell>
                                                    {
                                                        wallets.find(
                                                            (wallet) =>
                                                                wallet.id ===
                                                                row.accountWalletId
                                                        )?.name
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    {row.type === "EXPENSE"
                                                        ? "Expense"
                                                        : "Income"}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {row.type === "EXPENSE"
                                                        ? "−"
                                                        : "+"}
                                                    {row.amount}{" "}
                                                    {
                                                        wallets.find(
                                                            (wallet) =>
                                                                wallet.id ===
                                                                row.accountWalletId
                                                        )?.currency
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    {row.status === "POSTED"
                                                        ? "Posted"
                                                        : "Pending"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                            {preview.rows.length > 10 && (
                                <p className="text-xs text-muted-foreground">
                                    Previewing the first 10 of{" "}
                                    {preview.rows.length.toLocaleString()} rows.
                                </p>
                            )}
                        </>
                    ) : null}
                    {progress && (
                        <div
                            className="flex flex-col gap-2"
                            role="status"
                            aria-live="polite"
                        >
                            <label
                                htmlFor="import-progress"
                                className="text-sm font-medium"
                            >
                                {progress.completed.toLocaleString()} of{" "}
                                {progress.total.toLocaleString()} transactions
                                processed
                            </label>
                            <progress
                                id="import-progress"
                                value={progress.completed}
                                max={progress.total}
                                className="h-2 w-full accent-primary"
                            />
                            <p className="text-xs text-muted-foreground">
                                {progress.imported} added · {progress.skipped}{" "}
                                already imported.
                                {!success &&
                                    " Keep this page open while importing. Closing it stops the remaining batches; upload the exact same file to continue."}
                            </p>
                        </div>
                    )}
                    {message && (
                        <p
                            role={success ? "status" : "alert"}
                            className="text-sm"
                        >
                            {success && (
                                <CheckCircle2
                                    aria-hidden="true"
                                    className="mr-2 inline size-4"
                                />
                            )}
                            {message}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                        {pending && !success && (
                            <Button
                                variant="outline"
                                disabled={pauseRequested}
                                onClick={() => {
                                    pause.current = true
                                    setPauseRequested(true)
                                }}
                            >
                                {pauseRequested
                                    ? "Pausing after this batch…"
                                    : "Pause import"}
                            </Button>
                        )}
                        {success ? (
                            <Button
                                render={
                                    <Link
                                        href={`/dashboard/accounts/${financialAccountId}/transactions`}
                                    />
                                }
                                nativeButton={false}
                            >
                                View transactions
                            </Button>
                        ) : (
                            <Button
                                disabled={
                                    pending ||
                                    reading ||
                                    !preview?.rows.length ||
                                    Boolean(preview?.errors.length) ||
                                    !wallets.length
                                }
                                onClick={() => startTransition(runImport)}
                            >
                                <FileUp data-icon="inline-start" />
                                {pending
                                    ? "Importing…"
                                    : progress
                                      ? "Resume import"
                                      : `Import ${preview?.rows.length ?? ""} transactions`}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
