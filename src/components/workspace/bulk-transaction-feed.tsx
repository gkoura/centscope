"use client"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { ListChecks, LoaderCircle, Trash2 } from "lucide-react"
import { TransactionFeed } from "./transaction-feed"
import {
    prepareBulkAction,
    commitBulkAction,
} from "@/app/dashboard/accounts/[id]/transactions/bulk-actions"
import {
    MAX_BULK_SELECTED,
    type BulkInput,
    type BulkOperation,
    type BulkScope,
    type BulkPreview,
} from "@/lib/bulk-transaction-input"
import type { listOwnedAccountTransactions } from "@/lib/transactions"
import { categorySelectOptions } from "@/lib/category-input"
import { formatWalletMoney } from "@/lib/wallet-input"
import { publishWorkspaceEvent } from "@/lib/workspace-cache-events"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
} from "@/components/ui/field"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

type Transaction = Awaited<
    ReturnType<typeof listOwnedAccountTransactions>
>["transactions"][number]
type Category = {
    id: string
    name: string
    type: string
    parentId: string | null
    sortOrder?: number
}
type Wallet = { id: string; name: string; currency: string }
export function BulkTransactionFeed({
    accountId,
    transactions,
    returnTo,
    wallets,
    categories,
}: {
    accountId: string
    transactions: Transaction[]
    returnTo: string
    wallets: Wallet[]
    categories: Category[]
}) {
    const [selecting, setSelecting] = useState(false)
    const [selected, setSelected] = useState<Record<string, number>>({})
    const [open, setOpen] = useState(false)
    const [notice, setNotice] = useState("")
    const trigger = useRef<HTMLButtonElement>(null)
    const eligible = transactions.filter(
        (t) => t.type !== "OPENING_BALANCE" && t.canChangeStatus
    )
    const chosen = transactions.filter((t) => Object.hasOwn(selected, t.id))
    const toggle = (id: string) =>
        setSelected((previous) => {
            if (Object.hasOwn(previous, id)) {
                const next = { ...previous }
                delete next[id]
                return next
            }
            const row = eligible.find((t) => t.id === id)
            if (!row || Object.keys(previous).length >= MAX_BULK_SELECTED)
                return previous
            return { ...previous, [id]: row.version }
        })
    return (
        <div className="flex flex-col gap-4">
            <div className="transaction-selection-bar sticky z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
                {selecting ? (
                    <>
                        <div className="flex flex-wrap items-center gap-3">
                            <span role="status" className="text-sm font-medium">
                                {Object.keys(selected).length} selected
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setSelected(
                                        Object.keys(selected).length ===
                                            eligible.length
                                            ? {}
                                            : Object.fromEntries(
                                                  eligible
                                                      .slice(
                                                          0,
                                                          MAX_BULK_SELECTED
                                                      )
                                                      .map((t) => [
                                                          t.id,
                                                          t.version,
                                                      ])
                                              )
                                    )
                                }
                            >
                                Select shown
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelected({})}
                            >
                                Clear
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                ref={trigger}
                                type="button"
                                disabled={!chosen.length}
                                onClick={() => setOpen(true)}
                            >
                                Bulk actions
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setSelected({})
                                    setSelecting(false)
                                }}
                            >
                                Done
                            </Button>
                        </div>
                        <p className="w-full text-xs text-muted-foreground">
                            Selection covers shown rows only (up to{" "}
                            {MAX_BULK_SELECTED.toLocaleString("en")}). Opening
                            balances stay in wallet editing.
                        </p>
                    </>
                ) : (
                    <>
                        <p
                            role="status"
                            className="text-sm text-muted-foreground"
                        >
                            {notice || "Update several transactions together."}
                        </p>
                        <Button
                            ref={trigger}
                            variant="outline"
                            type="button"
                            disabled={!eligible.length}
                            onClick={() => {
                                setSelecting(true)
                                setNotice("")
                            }}
                        >
                            <ListChecks data-icon="inline-start" />
                            Select transactions
                        </Button>
                    </>
                )}
            </div>
            <TransactionFeed
                accountId={accountId}
                transactions={transactions}
                returnTo={returnTo}
                selection={
                    selecting
                        ? { ids: Object.keys(selected), toggle }
                        : undefined
                }
            />
            {open && (
                <BulkDialog
                    accountId={accountId}
                    chosen={chosen}
                    selected={selected}
                    wallets={wallets}
                    categories={categories}
                    returnFocus={trigger}
                    close={() => setOpen(false)}
                    success={(count, operation, completedRequestId) => {
                        setOpen(false)
                        setSelecting(false)
                        setSelected({})
                        setNotice(
                            `${count} ${count === 1 ? "transaction" : "transactions"} ${operation === "DELETE" ? "deleted" : "updated"}.`
                        )
                        toast.success(
                            `${count} ${count === 1 ? "transaction" : "transactions"} ${operation === "DELETE" ? "deleted" : "updated"}.`,
                            { id: `bulk-${completedRequestId}` }
                        )
                        publishWorkspaceEvent({ type: "changed" })
                        requestAnimationFrame(() =>
                            (
                                document.querySelector<HTMLButtonElement>(
                                    'button[aria-label="Transaction tools"]'
                                ) ?? trigger.current
                            )?.focus()
                        )
                    }}
                />
            )}
        </div>
    )
}
function BulkDialog({
    accountId,
    chosen,
    selected,
    wallets,
    categories,
    returnFocus,
    close,
    success,
}: {
    accountId: string
    chosen: Transaction[]
    selected: Record<string, number>
    wallets: Wallet[]
    categories: Category[]
    returnFocus: React.RefObject<HTMLButtonElement | null>
    close: () => void
    success: (
        count: number,
        operation: BulkOperation,
        requestId: string
    ) => void
}) {
    const [requestId] = useState(() => crypto.randomUUID())
    const [operation, setOperation] = useState<BulkOperation>("POSTED")
    const [scope, setScope] = useState<BulkScope>("ONLY")
    const [targetId, setTargetId] = useState("")
    const [preview, setPreview] = useState<BulkPreview | null>(null)
    const [fxRows, setFxRows] = useState<BulkPreview["fx"]>([])
    const [fx, setFx] = useState<BulkInput["fx"]>([])
    const [confirmed, setConfirmed] = useState(false)
    const [fxConfirmed, setFxConfirmed] = useState(false)
    const [pending, setPending] = useState(false)
    const [error, setError] = useState("")
    const eligibleType = chosen.every((r) => r.type === "EXPENSE")
        ? "EXPENSE"
        : chosen.every((r) => r.type === "INCOME")
          ? "INCOME"
          : null
    const canMove =
        chosen.every((r) => r.type === "EXPENSE" || r.type === "INCOME") &&
        new Set(chosen.map((r) => r.currency)).size === 1
    const categoryOptions = eligibleType
        ? categorySelectOptions(categories, eligibleType)
        : []
    const walletOptions = canMove
        ? wallets.filter((w) => w.currency === chosen[0].currency)
        : []
    const recurring = chosen.some((r) => r.occurrence)
    function invalidate() {
        setPreview(null)
        setConfirmed(false)
        setFxConfirmed(false)
        setError("")
    }
    function change() {
        invalidate()
        setFx([])
        setFxRows([])
        setTargetId("")
    }
    const input: BulkInput = {
        accountId,
        requestId,
        selected: Object.entries(selected).map(([id, version]) => ({
            id,
            version,
        })),
        operation,
        scope,
        targetId,
        fx,
    }
    async function review() {
        setPending(true)
        setPreview(null)
        setConfirmed(false)
        setFxConfirmed(false)
        setError("")
        try {
            const result = await prepareBulkAction(input)
            if (result.preview) {
                setPreview(result.preview)
                setFxRows(result.preview.fx)
                setFx(
                    result.preview.fx.map((r) => ({
                        id: r.id,
                        sent: r.sent,
                        received: r.received,
                    }))
                )
                setConfirmed(false)
                setFxConfirmed(false)
            } else setError(result.message ?? "Couldn’t prepare changes.")
        } catch {
            setError("Couldn’t load the preview. Try again.")
        } finally {
            setPending(false)
        }
    }
    async function apply() {
        if (!preview) return
        setPending(true)
        setError("")
        try {
            const result = await commitBulkAction(
                input,
                preview.snapshot,
                confirmed,
                fxConfirmed
            )
            if (result.success) success(result.count ?? 0, operation, requestId)
            else {
                if (result.reviewRequired) {
                    setPreview(null)
                    setConfirmed(false)
                    setFxConfirmed(false)
                }
                setError(result.message ?? "Couldn’t confirm changes.")
            }
        } catch {
            setError(
                "The response was interrupted. Retry this same confirmation safely."
            )
        } finally {
            setPending(false)
        }
    }
    return (
        <Dialog
            open
            onOpenChange={(value) => {
                if (!value && !pending) close()
            }}
        >
            <DialogContent
                finalFocus={returnFocus}
                showCloseButton={!pending}
                className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
            >
                <DialogHeader>
                    <DialogTitle>Bulk transaction actions</DialogTitle>
                    <DialogDescription>
                        {chosen.length} selected. Review the affected count and
                        wallet changes before confirming.
                    </DialogDescription>
                </DialogHeader>
                <fieldset disabled={pending} className="contents">
                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel htmlFor="bulk-operation">
                                Action
                            </FieldLabel>
                            <NativeSelect
                                id="bulk-operation"
                                className="w-full"
                                value={operation}
                                onChange={(e) => {
                                    change()
                                    setOperation(
                                        e.target.value as BulkOperation
                                    )
                                }}
                            >
                                <NativeSelectOption value="POSTED">
                                    Mark Posted
                                </NativeSelectOption>
                                <NativeSelectOption value="PENDING">
                                    Mark Pending
                                </NativeSelectOption>
                                <NativeSelectOption
                                    value="CATEGORY"
                                    disabled={!eligibleType}
                                >
                                    Change category
                                    {!eligibleType
                                        ? " (select only expenses or only income)"
                                        : ""}
                                </NativeSelectOption>
                                <NativeSelectOption
                                    value="WALLET"
                                    disabled={!canMove}
                                >
                                    Move to wallet
                                    {!canMove
                                        ? " (select expenses/income in one currency)"
                                        : ""}
                                </NativeSelectOption>
                                <NativeSelectOption value="DELETE">
                                    Delete transactions
                                </NativeSelectOption>
                            </NativeSelect>
                        </Field>
                        {operation === "CATEGORY" && (
                            <Field>
                                <FieldLabel htmlFor="bulk-category">
                                    New category
                                </FieldLabel>
                                <NativeSelect
                                    id="bulk-category"
                                    className="w-full"
                                    value={targetId}
                                    onChange={(e) => {
                                        invalidate()
                                        setTargetId(e.target.value)
                                    }}
                                >
                                    <NativeSelectOption value="">
                                        Choose a category
                                    </NativeSelectOption>
                                    {categoryOptions.map((c) => (
                                        <NativeSelectOption
                                            value={c.value}
                                            key={c.value}
                                        >
                                            {c.label}
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                        )}
                        {operation === "WALLET" && (
                            <Field>
                                <FieldLabel htmlFor="bulk-wallet">
                                    Destination wallet
                                </FieldLabel>
                                <NativeSelect
                                    id="bulk-wallet"
                                    className="w-full"
                                    value={targetId}
                                    onChange={(e) => {
                                        invalidate()
                                        setTargetId(e.target.value)
                                    }}
                                >
                                    <NativeSelectOption value="">
                                        Choose a wallet
                                    </NativeSelectOption>
                                    {walletOptions.map((w) => (
                                        <NativeSelectOption
                                            key={w.id}
                                            value={w.id}
                                        >
                                            {w.name} ({w.currency})
                                        </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                            </Field>
                        )}
                        {recurring && (
                            <Field>
                                <FieldLabel htmlFor="bulk-scope">
                                    Recurring scope
                                </FieldLabel>
                                <NativeSelect
                                    id="bulk-scope"
                                    className="w-full"
                                    value={scope}
                                    onChange={(e) => {
                                        invalidate()
                                        setFx([])
                                        setFxRows([])
                                        setScope(e.target.value as BulkScope)
                                    }}
                                >
                                    <NativeSelectOption value="ONLY">
                                        Only selected occurrences
                                    </NativeSelectOption>
                                    <NativeSelectOption value="FUTURE">
                                        This and future occurrences
                                    </NativeSelectOption>
                                    <NativeSelectOption value="ALL">
                                        All occurrences including past
                                    </NativeSelectOption>
                                </NativeSelect>
                                <p className="text-xs text-muted-foreground">
                                    Future starts at the earliest selected
                                    original scheduled slot in each series.
                                    Broader scopes can include rows outside this
                                    page and its filters. Ordinary selected
                                    transactions are included once.
                                </p>
                            </Field>
                        )}
                        {scope !== "ONLY" && (
                            <p className="text-sm text-muted-foreground">
                                {operation === "DELETE"
                                    ? "Deleting this scope stops further creation. Saved occurrences outside the scope remain."
                                    : "Category and wallet changes also update the recurring template. Generated copies always start Pending; dates never post them automatically."}
                            </p>
                        )}
                        {fxRows.length > 0 && (
                            <div className="flex flex-col gap-3 rounded-lg border p-3">
                                <h3 className="font-medium">
                                    Confirm actual FX amounts
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    These amounts apply to each occurrence only.
                                    Recurring estimates stay unchanged.
                                </p>
                                {fxRows.map((row) => (
                                    <Field key={row.id}>
                                        <FieldLabel>
                                            {row.name} · {row.date}
                                        </FieldLabel>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(
                                                ["sent", "received"] as const
                                            ).map((side) => (
                                                <Field key={side}>
                                                    <FieldLabel
                                                        htmlFor={`bulk-${row.id}-${side}`}
                                                    >
                                                        {side === "sent"
                                                            ? "Sent"
                                                            : "Received"}{" "}
                                                        (
                                                        {side === "sent"
                                                            ? row.sourceCurrency
                                                            : row.destinationCurrency}
                                                        )
                                                    </FieldLabel>
                                                    <Input
                                                        id={`bulk-${row.id}-${side}`}
                                                        inputMode="decimal"
                                                        value={
                                                            fx.find(
                                                                (f) =>
                                                                    f.id ===
                                                                    row.id
                                                            )?.[side] ?? ""
                                                        }
                                                        onChange={(e) => {
                                                            invalidate()
                                                            setFx((previous) =>
                                                                previous.map(
                                                                    (f) =>
                                                                        f.id ===
                                                                        row.id
                                                                            ? {
                                                                                  ...f,
                                                                                  [side]: e
                                                                                      .target
                                                                                      .value,
                                                                              }
                                                                            : f
                                                                )
                                                            )
                                                        }}
                                                    />
                                                </Field>
                                            ))}
                                        </div>
                                    </Field>
                                ))}
                            </div>
                        )}
                    </FieldGroup>
                </fieldset>
                {preview && (
                    <section
                        aria-label="Bulk change preview"
                        className="flex flex-col gap-3 rounded-lg border p-4"
                    >
                        <p className="font-medium">
                            {preview.changedCount} of {preview.count} affected
                            transactions will{" "}
                            {operation === "DELETE"
                                ? "be deleted"
                                : "be updated"}
                            .
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {preview.postedCount} currently Posted ·{" "}
                            {preview.count - preview.postedCount} Pending ·{" "}
                            {preview.historicalCount} dated before today ·{" "}
                            {preview.seriesCount} recurring series.
                        </p>
                        <h3 className="text-sm font-medium">
                            Posted balance changes
                        </h3>
                        {preview.balances.length ? (
                            <ul className="flex flex-col gap-1 text-sm">
                                {preview.balances.map((b) => (
                                    <li key={b.id}>
                                        {b.wallet}:{" "}
                                        {b.amount.startsWith("-") ? "" : "+"}
                                        {formatWalletMoney(
                                            b.amount,
                                            b.currency
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No Posted balance change.
                            </p>
                        )}
                        {operation === "DELETE" && (
                            <p className="text-sm text-destructive">
                                Both sides of transfers are deleted together.
                                This cannot be undone. Audit records and skipped
                                recurring slots are retained.
                            </p>
                        )}
                        <Field orientation="horizontal">
                            <Checkbox
                                id="bulk-confirm"
                                checked={confirmed}
                                onCheckedChange={(value) =>
                                    setConfirmed(value === true)
                                }
                                disabled={pending}
                            />
                            <FieldLabel htmlFor="bulk-confirm">
                                I reviewed the affected transactions and balance
                                changes
                                {scope === "ALL"
                                    ? ", including past occurrences"
                                    : ""}
                                .
                            </FieldLabel>
                        </Field>
                        {preview.fx.length > 0 && (
                            <Field orientation="horizontal">
                                <Checkbox
                                    id="bulk-fx-confirm"
                                    checked={fxConfirmed}
                                    onCheckedChange={(v) =>
                                        setFxConfirmed(v === true)
                                    }
                                    disabled={pending}
                                />
                                <FieldLabel htmlFor="bulk-fx-confirm">
                                    I confirm the listed sent/received amounts
                                    are actual amounts for every FX transfer.
                                </FieldLabel>
                            </Field>
                        )}
                    </section>
                )}
                {error && <FieldError role="alert">{error}</FieldError>}
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={close}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={
                            pending ||
                            ((operation === "CATEGORY" ||
                                operation === "WALLET") &&
                                !targetId)
                        }
                        onClick={() => void review()}
                    >
                        {pending ? (
                            <LoaderCircle
                                data-icon="inline-start"
                                className="animate-spin"
                            />
                        ) : null}
                        {preview ? "Refresh preview" : "Review changes"}
                    </Button>
                    {preview && (
                        <Button
                            type="button"
                            variant={
                                operation === "DELETE"
                                    ? "destructive"
                                    : "default"
                            }
                            disabled={
                                pending ||
                                !confirmed ||
                                !preview.changedCount ||
                                (preview.fx.length > 0 && !fxConfirmed)
                            }
                            onClick={() => void apply()}
                        >
                            {operation === "DELETE" ? (
                                <Trash2 data-icon="inline-start" />
                            ) : null}
                            {pending
                                ? "Applying…"
                                : operation === "DELETE"
                                  ? "Delete transactions"
                                  : "Apply changes"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
