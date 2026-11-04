"use client"

import { useActionState, useState } from "react"
import { Pencil } from "lucide-react"
import { updateWallet } from "@/app/dashboard/accounts/[id]/wallets/actions"
import { DatePicker } from "@/components/ui/date-picker"
import {
    openingStatuses,
    walletTypes,
    type WalletDetailsState,
} from "@/lib/wallet-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldDescription,
    FieldError,
} from "@/components/ui/field"
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectGroup,
    SelectItem,
} from "@/components/ui/select"

type WalletDetails = {
    id: string
    name: string
    type: "BANK" | "CASH" | "OTHER"
    currency: string
    updatedAt: string
    opening: {
        id: string
        version: number
        amount: string
        date: string
        status: "POSTED" | "PENDING"
    } | null
}
const initial: WalletDetailsState = {}

function WalletEditForm({
    financialAccountId,
    wallet,
    today,
    onSaved,
    onPending,
}: {
    financialAccountId: string
    wallet: WalletDetails
    today: string
    onSaved: () => void
    onPending: (pending: boolean) => void
}) {
    const [baseline] = useState(() => ({
        updatedAt: wallet.updatedAt,
        openingId: wallet.opening?.id ?? "",
        openingVersion: wallet.opening?.version ?? "",
    }))
    const [openingBalance, setOpeningBalance] = useState(
        wallet.opening?.amount ?? "0.00"
    )
    const [openingDate, setOpeningDate] = useState(
        wallet.opening?.date ?? today
    )
    const [openingStatus, setOpeningStatus] = useState<string>(
        wallet.opening?.status ?? "POSTED"
    )
    const [name, setName] = useState(wallet.name)
    const [type, setType] = useState<string>(wallet.type)
    const [state, action, pending] = useActionState(
        async (previous: WalletDetailsState, form: FormData) => {
            onPending(true)
            try {
                const result = await updateWallet(previous, form)
                if (result.success) onSaved()
                return result
            } catch {
                return {
                    message:
                        "We couldn’t confirm your changes. Refresh the page to check the wallet before trying again.",
                }
            } finally {
                onPending(false)
            }
        },
        initial
    )
    return (
        <form action={action} className="flex flex-col gap-5">
            <input
                type="hidden"
                name="financialAccountId"
                value={financialAccountId}
            />
            <input type="hidden" name="accountWalletId" value={wallet.id} />
            <input
                type="hidden"
                name="expectedUpdatedAt"
                value={baseline.updatedAt}
            />
            <input
                type="hidden"
                name="expectedOpeningId"
                value={baseline.openingId}
            />
            <input
                type="hidden"
                name="expectedOpeningVersion"
                value={baseline.openingVersion}
            />
            <fieldset disabled={pending} className="contents">
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor={`wallet-name-${wallet.id}`}>
                            Wallet name
                        </FieldLabel>
                        <Input
                            id={`wallet-name-${wallet.id}`}
                            name="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                            maxLength={80}
                            autoComplete="off"
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor={`wallet-type-${wallet.id}`}>
                            Wallet type
                        </FieldLabel>
                        <Select
                            name="type"
                            value={type}
                            items={walletTypes}
                            onValueChange={(value) => {
                                if (value) setType(value)
                            }}
                        >
                            <SelectTrigger
                                id={`wallet-type-${wallet.id}`}
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {walletTypes.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor={`wallet-currency-${wallet.id}`}>
                            Currency
                        </FieldLabel>
                        <Input
                            id={`wallet-currency-${wallet.id}`}
                            value={wallet.currency}
                            readOnly
                            aria-describedby={`wallet-currency-help-${wallet.id}`}
                        />
                        <FieldDescription
                            id={`wallet-currency-help-${wallet.id}`}
                        >
                            Currency is fixed here to preserve financial
                            history. Name and type changes apply wherever this
                            wallet is used.
                        </FieldDescription>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor={`wallet-opening-${wallet.id}`}>
                            Opening balance ({wallet.currency})
                        </FieldLabel>
                        <Input
                            id={`wallet-opening-${wallet.id}`}
                            name="openingBalance"
                            required
                            inputMode="decimal"
                            value={openingBalance}
                            onChange={(event) =>
                                setOpeningBalance(event.target.value)
                            }
                            maxLength={24}
                            placeholder="0.00"
                            aria-describedby={`wallet-opening-help-${wallet.id}`}
                        />
                        <FieldDescription
                            id={`wallet-opening-help-${wallet.id}`}
                        >
                            The starting amount for this account, not today’s
                            balance. Negative amounts are allowed. Set to zero
                            to clear the opening balance; your other
                            transactions stay separate.
                        </FieldDescription>
                    </Field>
                    <Field>
                        <FieldLabel
                            htmlFor={`wallet-opening-date-${wallet.id}`}
                        >
                            Opening balance date
                        </FieldLabel>
                        <DatePicker
                            id={`wallet-opening-date-${wallet.id}`}
                            name="openingDate"
                            value={openingDate}
                            onChange={setOpeningDate}
                        />
                    </Field>
                    <Field>
                        <FieldLabel
                            htmlFor={`wallet-opening-status-${wallet.id}`}
                        >
                            Opening balance status
                        </FieldLabel>
                        <Select
                            name="openingStatus"
                            value={openingStatus}
                            items={openingStatuses}
                            onValueChange={(value) => {
                                if (value) setOpeningStatus(value)
                            }}
                        >
                            <SelectTrigger
                                id={`wallet-opening-status-${wallet.id}`}
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {openingStatuses.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <FieldDescription>
                            Posted counts toward your balance. Pending does not.
                            The date never changes the status automatically.
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </fieldset>
            {state.message && (
                <FieldError role="alert">{state.message}</FieldError>
            )}
            <DialogFooter>
                <DialogClose
                    render={
                        <Button
                            variant="outline"
                            type="button"
                            disabled={pending}
                        />
                    }
                >
                    Cancel
                </DialogClose>
                <Button type="submit" disabled={pending}>
                    {pending ? "Saving…" : "Save changes"}
                </Button>
            </DialogFooter>
        </form>
    )
}

export function WalletEditDialog({
    financialAccountId,
    wallet,
    today,
    disabled,
}: {
    financialAccountId: string
    wallet: WalletDetails
    today: string
    disabled?: boolean
}) {
    const [open, setOpen] = useState(false),
        [pending, setPending] = useState(false)
    return (
        <Dialog
            open={open}
            onOpenChange={(next, details) => {
                if (pending) details.cancel()
                else setOpen(next)
            }}
        >
            <DialogTrigger
                render={<Button variant="outline" size="sm" />}
                disabled={disabled}
                aria-label={`Edit ${wallet.name}`}
            >
                <Pencil data-icon="inline-start" />
                Edit
            </DialogTrigger>
            <DialogContent
                showCloseButton={!pending}
                className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg"
            >
                <DialogHeader>
                    <DialogTitle>Edit wallet</DialogTitle>
                    <DialogDescription className="break-words">
                        Update the details for {wallet.name}.
                    </DialogDescription>
                </DialogHeader>
                <WalletEditForm
                    financialAccountId={financialAccountId}
                    wallet={wallet}
                    today={today}
                    onPending={setPending}
                    onSaved={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    )
}
