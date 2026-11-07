"use client"

import NextLink from "next/link"
import type { ComponentProps } from "react"
import { localizeHref } from "@/lib/i18n/config"
import { useLocale } from "./locale-provider"

export default function Link({
    href,
    ...props
}: ComponentProps<typeof NextLink>) {
    const locale = useLocale()
    const localized =
        typeof href === "string"
            ? localizeHref(href, locale)
            : {
                  ...href,
                  pathname: href.pathname
                      ? localizeHref(href.pathname, locale)
                      : href.pathname,
              }
    return <NextLink href={localized} {...props} />
}
