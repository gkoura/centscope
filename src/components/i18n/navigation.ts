"use client"

import { useMemo } from "react"
import {
    usePathname as useNextPathname,
    useRouter as useNextRouter,
} from "next/navigation"
import { localizeHref, stripLocale } from "@/lib/i18n/config"
import { useLocale } from "./locale-provider"

export function usePathname() {
    return stripLocale(useNextPathname())
}

export function useRouter() {
    const router = useNextRouter()
    const locale = useLocale()
    return useMemo(
        () => ({
            ...router,
            push: (href: string, options?: Parameters<typeof router.push>[1]) =>
                router.push(localizeHref(href, locale), options),
            replace: (
                href: string,
                options?: Parameters<typeof router.replace>[1]
            ) => router.replace(localizeHref(href, locale), options),
            prefetch: (
                href: string,
                options?: Parameters<typeof router.prefetch>[1]
            ) => router.prefetch(localizeHref(href, locale), options),
        }),
        [router, locale]
    )
}
