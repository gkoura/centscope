"use client"

import { useLocale, useTranslations } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"

import { useAuth, useRevokeSession, useSession } from "@better-auth-ui/react"
import type { Session } from "better-auth"
import Bowser from "bowser"
import { Monitor, Smartphone, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { SignOutButton } from "@/components/auth/sign-out-button"

function timeAgo(date: Date, locale: string) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

    const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
        ["year", 31536000],
        ["month", 2592000],
        ["week", 604800],
        ["day", 86400],
        ["hour", 3600],
        ["minute", 60],
        ["second", 1],
    ]

    for (const [unit, threshold] of UNITS) {
        if (seconds >= threshold) {
            return rtf.format(-Math.floor(seconds / threshold), unit)
        }
    }

    return rtf.format(0, "second")
}

export type ActiveSessionProps = {
    activeSession: Session
}

/**
 * Render a single active session row with device info and revoke control.
 *
 * Shows the session's browser, OS, and creation time. The current session is marked
 * and navigates to sign-out on click, while other sessions can be revoked individually.
 *
 * @param session - The session object containing id, token, userAgent, ipAddress, and createdAt
 * @returns A JSX element containing the active session row
 */
export function ActiveSession({ activeSession }: ActiveSessionProps) {
    const t = useTranslations()
    const locale = intlLocale(useLocale())
    const { authClient, localization } = useAuth()
    const { data: session } = useSession(authClient, { refetchOnMount: false })

    const { mutate: revokeSession, isPending: isRevoking } = useRevokeSession(
        authClient,
        {
            onSuccess: () =>
                toast.success(localization.settings.revokeSessionSuccess),
        }
    )

    const isCurrentSession = activeSession.id === session?.session.id
    const ua = activeSession.userAgent
        ? Bowser.parse(activeSession.userAgent)
        : undefined
    const isMobile =
        ua?.platform.type === "mobile" || ua?.platform.type === "tablet"

    return (
        <Item>
            <ItemMedia variant="icon">
                {isMobile ? <Smartphone /> : <Monitor />}
            </ItemMedia>
            <ItemContent>
                <ItemTitle>
                    {ua?.browser.name || t("Unknown Browser")}
                    {ua?.os.name ? `, ${ua.os.name}` : ""}
                </ItemTitle>
                {isCurrentSession ? (
                    <Badge variant="secondary">
                        {localization.settings.currentSession}
                    </Badge>
                ) : null}
                <ItemDescription>
                    {t("Signed in {time}", { time: timeAgo(new Date(activeSession.createdAt), locale) })}
                </ItemDescription>
                <ItemDescription>
                    {t("Session refreshed {time}", { time: timeAgo(new Date(activeSession.updatedAt), locale) })}
                </ItemDescription>
            </ItemContent>
            <ItemActions>
                {isCurrentSession ? (
                    <SignOutButton />
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeSession(activeSession)}
                        disabled={isRevoking}
                        aria-label={`Sign out ${ua?.browser.name || "unknown browser"}${ua?.os.name ? ` on ${ua.os.name}` : ""}`}
                    >
                        {isRevoking ? <Spinner /> : <X />}

                        {localization.settings.revoke}
                    </Button>
                )}
            </ItemActions>
        </Item>
    )
}
