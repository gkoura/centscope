"use server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireVerifiedSession } from "@/lib/auth/session"
import {
    validateTransferInput,
    positiveTransferMoney,
    type TransferFormState,
} from "@/lib/transfer-input"
import {
    createOwnedTransfer,
    updateOwnedTransfer,
    changeOwnedTransferStatus,
    listOwnedTransferWallets,
} from "@/lib/transfers"
import { TransferError } from "@/lib/transfer-core"
import { RecurrenceError } from "@/lib/recurrence-engine"
const message = (error: unknown) =>
    error instanceof TransferError || error instanceof RecurrenceError
        ? error.message
        : "Couldn’t save this transfer. Refresh to check it before retrying."
export async function saveTransfer(
    _state: TransferFormState,
    form: FormData
): Promise<TransferFormState> {
    await requireVerifiedSession()
    const result = validateTransferInput(form)
    if (!result.data) return { errors: result.errors }
    const id = String(form.get("transactionId") ?? ""),
        version = Number(form.get("expectedVersion"))
    if (
        id &&
        (id.length > 128 ||
            !Number.isInteger(version) ||
            version < 1 ||
            version > 2147483646)
    )
        return { message: "Reload this transfer before editing." }
    const options = await listOwnedTransferWallets(
            result.data.contextAccountId
        ),
        endpoints = options.filter((o) =>
            [result.data!.sourceId, result.data!.destinationId].includes(o.id)
        )
    try {
        if (id) await updateOwnedTransfer(result.data, id, version)
        else await createOwnedTransfer(result.data)
    } catch (error) {
        return { message: message(error) }
    }
    const context = endpoints.some(
        (e) => e.financialAccountId === result.data!.contextAccountId
    )
        ? result.data.contextAccountId
        : (endpoints.find((e) => e.id === result.data!.sourceId)
              ?.financialAccountId ?? result.data.contextAccountId)
    revalidatePath("/dashboard", "layout")
    redirect(`/dashboard/accounts/${context}/transactions`)
}
export async function setTransferStatus(
    _state: TransferFormState,
    form: FormData
): Promise<TransferFormState> {
    await requireVerifiedSession()
    const financialAccountId = String(form.get("financialAccountId") ?? ""),
        transactionId = String(form.get("transactionId") ?? ""),
        expectedVersion = Number(form.get("expectedVersion")),
        status = String(form.get("status"))
    if (
        !financialAccountId ||
        financialAccountId.length > 128 ||
        !transactionId ||
        transactionId.length > 128 ||
        !Number.isInteger(expectedVersion) ||
        expectedVersion < 1 ||
        expectedVersion > 2147483646 ||
        !["POSTED", "PENDING"].includes(status)
    )
        return { message: "Reload before changing this transfer." }
    const sent = String(form.get("amount") ?? ""),
        received = String(form.get("destinationAmount") ?? "")
    if (
        (sent && !positiveTransferMoney(sent)) ||
        (received && !positiveTransferMoney(received))
    )
        return {
            message:
                "Enter positive sent and received amounts with up to two decimal places.",
        }
    try {
        await changeOwnedTransferStatus({
            financialAccountId,
            transactionId,
            expectedVersion,
            status: status as "POSTED" | "PENDING",
            amount: sent ? positiveTransferMoney(sent)! : undefined,
            destinationAmount: received
                ? positiveTransferMoney(received)!
                : undefined,
            confirmed: form.get("confirmed") === "yes",
        })
    } catch (error) {
        return { message: message(error) }
    }
    revalidatePath("/dashboard", "layout")
    return {}
}
