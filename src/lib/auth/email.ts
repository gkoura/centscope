import "server-only"

type AuthEmail = { to: string; url: string }

export async function sendVerificationEmail({ to, url }: AuthEmail) {
    await sendAuthEmail(
        to,
        "Verify your Fintrack email",
        [
            "Welcome to Fintrack.",
            "Verify your email address by opening this link:",
            url,
            "This link expires in one hour.",
            "If you did not create this account, you can ignore this email.",
        ].join("\n\n")
    )
}

export async function sendPasswordResetEmail({ to, url }: AuthEmail) {
    await sendAuthEmail(
        to,
        "Reset your Fintrack password",
        [
            "Reset your password by opening this link:",
            url,
            "This link expires in 30 minutes and can only be used once.",
            "If you did not request this reset, ignore this email. Your password has not changed.",
        ].join("\n\n")
    )
}

async function sendAuthEmail(to: string, subject: string, text: string) {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.AUTH_EMAIL_FROM
    if (!apiKey || !from) {
        throw new Error(
            "Auth email requires RESEND_API_KEY and AUTH_EMAIL_FROM."
        )
    }
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from,
            to: [to],
            subject,
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
