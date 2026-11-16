"use client"

import { useState } from "react"
import Link from "next/link"
import { Copy } from "lucide-react"
import { validDay } from "@/lib/account-period"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Field, FieldLabel } from "@/components/ui/field"
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

export function DuplicateTransactionDialog({
    accountId,
    transaction,
    returnTo,
    disabled,
    onNavigate,
}: {
    accountId: string
    transaction: { id: string; name: string }
    returnTo?: string
    disabled?: boolean
    onNavigate?: () => void
}) {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState("")
    const [intent, setIntent] = useState("")
    const query = new URLSearchParams({
        date,
        copy: intent,
        ...(returnTo ? { returnTo } : {}),
    })
    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (next) {
                    setDate(new Date().toISOString().slice(0, 10))
                    setIntent(crypto.randomUUID())
                }
                setOpen(next)
            }}
        >
            <DialogTrigger
                render={<Button variant="outline" size="sm" />}
                disabled={disabled}
                aria-label={`Duplicate ${transaction.name}`}
            >
                <Copy data-icon="inline-start" />
                Duplicate
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Duplicate transaction</DialogTitle>
                    <DialogDescription className="[overflow-wrap:anywhere] break-words">
                        Choose a date for a new copy of {transaction.name}.
                        Review its details before saving.
                    </DialogDescription>
                </DialogHeader>
                <Field>
                    <FieldLabel htmlFor={`duplicate-date-${transaction.id}`}>
                        Date for the copy
                    </FieldLabel>
                    <DatePicker
                        id={`duplicate-date-${transaction.id}`}
                        name="duplicateDate"
                        value={date}
                        onChange={setDate}
                        showShortcuts
                        required
                    />
                </Field>
                <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>
                        Cancel
                    </DialogClose>
                    <Button
                        nativeButton={false}
                        disabled={!validDay(date)}
                        render={
                            <Link
                                href={`/dashboard/accounts/${accountId}/transactions/${transaction.id}/duplicate?${query}`}
                                onClick={onNavigate}
                                prefetch={false}
                            />
                        }
                    >
                        Review copy
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
