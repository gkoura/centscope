import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { accessibleAccount, lockFinancialAccess } from "@/lib/financial-access"
import { requireVerifiedSession } from "@/lib/auth/session"
import { sendAccountInviteEmail } from "@/lib/auth/email"

const digest = (token: string) =>
    createHash("sha256").update(token).digest("hex")
export class SharingError extends Error {}

export async function lockSharingAccount(
    tx: Prisma.TransactionClient,
    id: string,
    userId: string,
    allowMember = false
) {
    const ownerId = await lockFinancialAccess(tx, id, userId)
    if (!allowMember && ownerId !== userId)
        throw new SharingError("Only the account owner can manage sharing.")
}

export async function listSharedAccounts() {
    const { user } = await requireVerifiedSession()
    return prisma.accountMembership.findMany({
        where: { userId: user.id, financialAccount: { archivedAt: null } },
        select: {
            role: true,
            financialAccount: {
                select: { id: true, name: true, reportingCurrency: true },
            },
        },
        orderBy: [{ createdAt: "asc" }, { financialAccountId: "asc" }],
    })
}

export async function inviteMember(id: string, email: string) {
    const { user } = await requireVerifiedSession()
    const address = email.trim().toLowerCase()
    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ||
        address.length > 254 ||
        address === user.email.toLowerCase()
    )
        throw new SharingError("Enter another person’s email address.")
    const token = randomBytes(32).toString("hex")
    const url = new URL(
        "/dashboard/sharing/invite",
        process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL
    )
    url.searchParams.set("token", token)
    const tokenHash = digest(token)
    await prisma.$transaction(async (tx) => {
        await lockSharingAccount(tx, id, user.id)
        if (
            await tx.accountMembership.findFirst({
                where: {
                    financialAccountId: id,
                    user: { email: { equals: address, mode: "insensitive" } },
                },
            })
        )
            throw new SharingError("This person already has access.")
        const values = {
            role: "COLLABORATOR" as const,
            tokenHash,
            invitedById: user.id,
            expiresAt: new Date(Date.now() + 7 * 86400000),
        }
        await tx.accountInvitation.upsert({
            where: {
                financialAccountId_email: {
                    financialAccountId: id,
                    email: address,
                },
            },
            create: { financialAccountId: id, email: address, ...values },
            update: values,
        })
    })
    try {
        await sendAccountInviteEmail(address, url.toString())
    } catch {
        await prisma.accountInvitation.deleteMany({ where: { tokenHash } })
        throw new SharingError("Delivery failed. Send the invitation again.")
    }
}

export async function acceptInvite(token: string) {
    const { user } = await requireVerifiedSession()
    const tokenHash = digest(token)
    const unavailable = () =>
        new SharingError(
            "This invitation is unavailable for your verified email address."
        )
    return prisma.$transaction(async (tx) => {
        const invite = await tx.accountInvitation.findUnique({
            where: { tokenHash },
        })
        if (!invite || invite.email !== user.email.toLowerCase())
            throw unavailable()
        const [account] = await tx.$queryRaw<
            { ownerId: string }[]
        >`SELECT "ownerId" FROM financial_account WHERE id=${invite.financialAccountId} AND "archivedAt" IS NULL FOR UPDATE`
        if (
            !account ||
            account.ownerId !== invite.invitedById ||
            account.ownerId === user.id
        )
            throw unavailable()
        const consumed = await tx.accountInvitation.deleteMany({
            where: { tokenHash, expiresAt: { gt: new Date() } },
        })
        if (consumed.count !== 1) throw unavailable()
        await tx.accountMembership.create({
            data: {
                financialAccountId: invite.financialAccountId,
                userId: user.id,
                role: "COLLABORATOR",
            },
        })
        return invite.financialAccountId
    })
}

export async function manageMember(
    id: string,
    target: string,
    action: "cancel" | "remove" | "leave"
) {
    const { user } = await requireVerifiedSession()
    await prisma.$transaction(async (tx) => {
        await lockSharingAccount(tx, id, user.id, action === "leave")
        if (action === "cancel")
            await tx.accountInvitation.deleteMany({
                where: { id: target, financialAccountId: id },
            })
        else
            await tx.accountMembership.deleteMany({
                where: {
                    financialAccountId: id,
                    userId: action === "leave" ? user.id : target,
                },
            })
    })
}

export async function invitationPreview(token: string) {
    const { user } = await requireVerifiedSession()
    return prisma.accountInvitation.findFirst({
        where: {
            tokenHash: digest(token),
            email: user.email.toLowerCase(),
            expiresAt: { gt: new Date() },
            financialAccount: { archivedAt: null },
        },
        select: { financialAccount: { select: { name: true } } },
    })
}

export async function getSharingSettings(id: string) {
    const { user } = await requireVerifiedSession()
    const account = await prisma.financialAccount.findFirst({
        where: { id, ...accessibleAccount(user.id) },
        select: { name: true, ownerId: true },
    })
    if (!account) return null
    const isOwner = account.ownerId === user.id
    if (!isOwner) return { ...account, isOwner, members: [], invites: [] }
    const [members, invites] = await Promise.all([
        prisma.accountMembership.findMany({
            where: {
                financialAccountId: id,
                financialAccount: { ownerId: user.id },
            },
            select: { userId: true, user: { select: { email: true } } },
            orderBy: { createdAt: "asc" },
        }),
        prisma.accountInvitation.findMany({
            where: {
                financialAccountId: id,
                financialAccount: { ownerId: user.id },
                expiresAt: { gt: new Date() },
            },
            select: { id: true, email: true },
            orderBy: { createdAt: "asc" },
        }),
    ])
    return { ...account, isOwner, members, invites }
}
