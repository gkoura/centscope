"use client"

import { useActionState } from "react"
import { changeTransactionStatus } from "@/app/dashboard/accounts/[id]/transactions/actions"
import type { TransactionFormState } from "@/lib/transaction-input"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"

const initialState: TransactionFormState = {}
export function TransactionStatusForm({
    financialAccountId,
    transactionId,
    name,
    status,
    version,
}: {
    financialAccountId: string
    transactionId: string
    name: string
    status: "POSTED" | "PENDING"
    version: number
}) {
    const [state, action, pending] = useActionState(
        changeTransactionStatus,
        initialState
    )
    const target = status === "POSTED" ? "PENDING" : "POSTED"
    return (
        <form
            action={action}
            className="flex max-w-56 flex-col items-start gap-2"
        >
            <input
                type="hidden"
                name="financialAccountId"
                value={financialAccountId}
            />
            <input type="hidden" name="transactionId" value={transactionId} />
            <input type="hidden" name="expectedVersion" value={version} />
            <input type="hidden" name="status" value={target} />
            <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={pending}
                aria-label={`Mark ${name} as ${target.toLowerCase()}`}
            >
                {pending ? "Saving…" : `Mark ${target.toLowerCase()}`}
            </Button>
            {state.message ? (
                <FieldError role="alert" className="whitespace-normal">
                    {state.message}
                </FieldError>
            ) : null}
        </form>
    )
}
