"use client"

import { Languages } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "./locale-provider"
import { localizeHref } from "@/lib/i18n/config"
import { Button } from "@/components/ui/button"

export function LanguageSwitcher() {
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations()
    const nextLocale = locale === "el" ? "en" : "el"
    return (
        <Button
            variant="ghost"
            size="sm"
            className="min-h-11 shrink-0 px-2"
            lang={nextLocale}
            aria-label={t("Change language to {language}", {
                language: nextLocale === "el" ? "Ελληνικά" : "English",
            })}
            title={nextLocale === "el" ? "Ελληνικά" : "English"}
            onClick={() => {
                const { pathname, search, hash } = window.location
                router.push(
                    `${localizeHref(pathname, nextLocale)}${search}${hash}`
                )
            }}
        >
            <Languages data-icon="inline-start" aria-hidden="true" />
            <span>{nextLocale === "el" ? "ΕΛ" : "EN"}</span>
        </Button>
    )
}
