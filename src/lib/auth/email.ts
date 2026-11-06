import "server-only"
import { createElement, type ReactElement } from "react"
import { render, toPlainText } from "react-email"
import VerifyEmail from "../../../emails/verify-email"
import ResetPassword from "../../../emails/reset-password"
import DeleteAccount from "../../../emails/delete-account"

type AuthEmail = { to: string; url: string }

export async function sendDeleteAccountEmail({ to, url }: AuthEmail) {
    await sendAuthEmail(
        to,
        "Confirm deletion of your CentScope account",
        createElement(DeleteAccount, { url })
    )
}

export async function sendVerificationEmail({ to, url }: AuthEmail) {
    await sendAuthEmail(
        to,
        "Verify your CentScope email",
        createElement(VerifyEmail, { url })
    )
}

export async function sendPasswordResetEmail({ to, url }: AuthEmail) {
    await sendAuthEmail(
        to,
        "Reset your CentScope password",
        createElement(ResetPassword, { url })
    )
}

async function sendAuthEmail(
    to: string,
    subject: string,
    template: ReactElement
) {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.AUTH_EMAIL_FROM
    if (!apiKey || !from) {
        throw new Error(
            "Auth email requires RESEND_API_KEY and AUTH_EMAIL_FROM."
        )
    }
    const html = await render(template)
    const text = toPlainText(html)
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            // Keep the configured, verified mailbox; branding owns only its display name.
            from: `CentScope <${from.match(/<([^<>]+)>\s*$/)?.[1] ?? from.trim()}>`,
            to: [to],
            subject,
            html,
            text,
        }),
        signal: AbortSignal.timeout(10_000),
    })
    // Provider responses can contain personal data; log only the status.
    if (!response.ok) {
        const hint =
            response.status === 403 && from.includes("onboarding@resend.dev")
                ? " The Resend test sender can deliver only to your Resend account email. Check the recipient and API key permissions in Resend."
                : ""
        throw new Error(
            `Resend auth email delivery failed (${response.status}).${hint}`
        )
    }
}
