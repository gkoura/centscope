"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
    const t = useTranslations()

    const { resolvedTheme, setTheme } = useTheme()
    return (
        <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t("Toggle light and dark mode")}
            title={t("Toggle light and dark mode")}
            onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
        >
            <Sun className="hidden dark:block" aria-hidden="true" />
            <Moon className="dark:hidden" aria-hidden="true" />
        </Button>
    )
}
