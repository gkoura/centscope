import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { after } from "next/server"
import {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendDeleteAccountEmail,
} from "@/lib/auth/email"
import { deleteAccountData } from "@/lib/auth/delete-account-data"
import { prisma } from "@/lib/prisma"

export const auth = betterAuth({
    appName: "CentScope",
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    user: {
        deleteUser: {
            enabled: true,
            deleteTokenExpiresIn: 30 * 60,
            sendDeleteAccountVerification: async ({ user, url }) => {
                await sendDeleteAccountEmail({ to: user.email, url })
            },
            beforeDelete: async (user) => {
                await deleteAccountData(user.id)
            },
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            enabled: Boolean(
                process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ),
            prompt: "select_account",
        },
    },
    account: {
        encryptOAuthTokens: true,
        accountLinking: {
            enabled: true,
            disableImplicitLinking: false,
            requireLocalEmailVerified: true,
            trustedProviders: [],
            allowDifferentEmails: false,
            allowUnlinkingAll: false,
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        minPasswordLength: 15,
        maxPasswordLength: 128,
        resetPasswordTokenExpiresIn: 30 * 60,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }) => {
            await sendPasswordResetEmail({ to: user.email, url })
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: false,
        expiresIn: 60 * 60,
        sendVerificationEmail: async ({ user, url }) => {
            await sendVerificationEmail({ to: user.email, url })
        },
    },
    advanced: {
        backgroundTasks: { handler: (task) => after(() => task) },
    },
})
