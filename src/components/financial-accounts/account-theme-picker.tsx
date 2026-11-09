"use client"

import { useState, useTransition } from "react"
import { Check, Palette } from "lucide-react"
import { accountTheme, accountThemes } from "@/lib/account-theme"
import { saveAccountTheme } from "@/app/dashboard/accounts/theme-actions"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverTitle,
    PopoverDescription,
} from "@/components/ui/popover"

export function AccountThemePicker({
    accountId,
    theme,
    isOwner,
    accountName,
    showLabel = false,
}: {
    accountId: string
    theme: string
    isOwner: boolean
    accountName?: string
    showLabel?: boolean
}) {
    const [pending, startTransition] = useTransition()
    const [message, setMessage] = useState("")
    const current = accountTheme(theme)
    const label = accountName ? `${accountName} theme` : "Account theme"
    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        variant={showLabel ? "outline" : "ghost"}
                        size={showLabel ? "default" : "icon-lg"}
                    />
                }
                aria-label={`${label}: ${current.name}`}
                title={label}
            >
                <Palette aria-hidden="true" />
                {showLabel && "Theme"}
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-72 max-w-[calc(100vw-2rem)] p-4"
            >
                <PopoverTitle className="wrap-break-word">{label}</PopoverTitle>
                <PopoverDescription>
                    {isOwner
                        ? "Choose a color for this account. Everyone with access sees the same theme."
                        : "This account’s theme is chosen by its owner."}
                </PopoverDescription>
                <div
                    role="group"
                    aria-label="Account color options"
                    aria-busy={pending}
                    className="grid grid-cols-2 gap-2"
                >
                    {accountThemes.map((option) => (
                        <Button
                            key={option.id}
                            variant="outline"
                            className="h-12 justify-start gap-2"
                            aria-pressed={current.id === option.id}
                            disabled={pending || !isOwner}
                            onClick={() => {
                                setMessage("")
                                startTransition(async () => {
                                    try {
                                        const result = await saveAccountTheme(
                                            accountId,
                                            option.id
                                        )
                                        setMessage(result.message)
                                    } catch {
                                        setMessage(
                                            "Couldn’t save the theme. Please try again."
                                        )
                                    }
                                })
                            }}
                        >
                            <span
                                className="size-4 shrink-0 rounded-full"
                                style={{ backgroundColor: option.color }}
                                aria-hidden="true"
                            />
                            {option.name}
                            {current.id === option.id && (
                                <Check
                                    className="ml-auto size-4"
                                    aria-hidden="true"
                                />
                            )}
                        </Button>
                    ))}
                </div>
                <p role="status" className="text-xs text-muted-foreground">
                    {pending
                        ? "Saving theme…"
                        : message || `Current theme: ${current.name}`}
                </p>
            </PopoverContent>
        </Popover>
    )
}
