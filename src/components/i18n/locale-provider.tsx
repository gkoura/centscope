"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { Locale } from "@/lib/i18n/config"
import { createTranslator } from "@/lib/i18n/translate"

const LocaleContext = createContext<Locale>("en")

export function LocaleProvider({
    locale,
    children,
}: {
    locale: Locale
    children: ReactNode
}) {
    return <LocaleContext value={locale}>{children}</LocaleContext>
}

export function useLocale() {
    return useContext(LocaleContext)
}

export function useTranslations() {
    const locale = useLocale()
    return useMemo(() => createTranslator(locale), [locale])
}
