"use server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import {
    acceptInvite,
    inviteMember,
    manageMember,
    SharingError,
} from "@/lib/account-sharing"

const value = (form: FormData, key: string) => String(form.get(key) ?? "")
export async function sharingAction(id: string, form: FormData) {
    let destination = "/dashboard/sharing/" + encodeURIComponent(id)
    const action = value(form, "action"),
        target = value(form, "target")
    try {
        if (action === "invite") {
            await inviteMember(id, value(form, "email"))
        } else if (
            action === "leave" ||
            action === "cancel" ||
            action === "remove"
        ) {
            await manageMember(id, target, action)
            if (action === "leave") destination = "/dashboard/accounts"
        } else throw new SharingError("Unknown action.")
    } catch (error) {
        if (!(error instanceof SharingError)) throw error
        destination += "?error=" + encodeURIComponent(error.message)
    }
    revalidatePath("/dashboard/accounts")
    revalidatePath("/dashboard/sharing/[id]", "page")
    redirect(destination)
}

export async function acceptAction(token: string) {
    let destination: string
    try {
        destination = "/dashboard/accounts/" + (await acceptInvite(token))
    } catch (error) {
        if (!(error instanceof SharingError)) throw error
        destination = "/dashboard/sharing/invite?unavailable=1"
    }
    revalidatePath("/dashboard/accounts")
    redirect(destination)
}
