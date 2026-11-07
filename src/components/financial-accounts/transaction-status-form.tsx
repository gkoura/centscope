"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useActionState, useRef, useState } from "react"
import { changeTransactionStatus } from "@/app/[locale]/dashboard/accounts/[id]/transactions/actions"
import type { TransactionFormState } from "@/lib/transaction-input"
import { StatusSwitch } from "./status-switch"

const initialState: TransactionFormState = {}
export function TransactionStatusForm({
    compact = false,
    financialAccountId,
    transactionId,
    name,
    status,
    version,
}: {
    compact?: boolean
    financialAccountId: string
    transactionId: string
    name: string
    status: "POSTED" | "PENDING"
    version: number
}) {
    const t = useTranslations()

    const [requested, setRequested] = useState<{
        version: number
        status: "POSTED" | "PENDING"
    } | null>(null)
    const [state, action, pending] = useActionState(
        async (previous: TransactionFormState, form: FormData) => {
            const result = await changeTransactionStatus(previous, form)
            if (result.message || result.errors) setRequested(null)
            return result
        },
        initialState
    )
    const formRef = useRef<HTMLFormElement>(null)
    const target = status === "POSTED" ? "PENDING" : "POSTED"
    const awaitingRefresh = requested?.version === version
    return (
        <form
            ref={formRef}
            action={action}
            className="flex max-w-full flex-col items-start gap-2"
        >
            <input
                type="hidden"
                name="financialAccountId"
                value={financialAccountId}
            />
            <input type="hidden" name="transactionId" value={transactionId} />
            <input type="hidden" name="expectedVersion" value={version} />
            <input type="hidden" name="status" value={target} />
            <StatusSwitch
                compact={compact}
                value={awaitingRefresh ? requested.status : status}
                onValueChange={(next) => {
                    setRequested({ version, status: next })
                    formRef.current?.requestSubmit()
                }}
                disabled={pending || awaitingRefresh}
                saving={pending || awaitingRefresh}
                error={t(state.message || "")}
                accessibleLabel={t("Posted status for {name}", { name })}
                description={t(
                    "Posted affects your balance. Pending does not."
                )}
            />
        </form>
    )
}
