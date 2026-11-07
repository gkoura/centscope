"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import Link from "@/components/i18n/link"
import { LogOut, Settings2, UserRound, LoaderCircle } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useSignOut } from "@/lib/auth/use-sign-out"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function UserMenu() {
    const t = useTranslations()

    // Subscribe to the same Better Auth session store as the workspace shell.
    const { data: session } = authClient.useSession()
    const { signOut, pending } = useSignOut()
    const user = session?.user
    const name = user?.name?.trim()
    const initials = name
        ? name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => Array.from(part)[0])
              .join("")
              .toUpperCase()
        : user?.email?.slice(0, 1).toUpperCase()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-lg"
                        className="size-11 rounded-full"
                    />
                }
                aria-label={t("Account menu")}
                title={t("Account menu")}
                disabled={pending}
                aria-busy={pending}
            >
                <Avatar className="size-9" aria-hidden="true">
                    {user?.image && <AvatarImage src={user.image} alt="" />}
                    <AvatarFallback>
                        {initials || <UserRound className="size-4" />}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex min-w-0 flex-col gap-1 py-2">
                        <span className="truncate">
                            {name || t("Your account")}
                        </span>
                        {user?.email && (
                            <span className="truncate text-xs font-normal text-muted-foreground">
                                {user.email}
                            </span>
                        )}
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        render={<Link href="/settings/security" />}
                        disabled={pending}
                        className="min-h-11"
                    >
                        <Settings2 /> {t("Settings")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => void signOut()}
                        closeOnClick={false}
                        disabled={pending}
                        className="min-h-11"
                    >
                        {pending ? (
                            <LoaderCircle className="animate-spin motion-reduce:animate-none" />
                        ) : (
                            <LogOut />
                        )}
                        {pending ? t("Signing out…") : t("Sign out")}
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
