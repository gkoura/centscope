export const locales = ["en", "el"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"
export const LOCALE_COOKIE = "centscope-locale"

export function isLocale(value: string | undefined): value is Locale {
    return locales.some((locale) => locale === value)
}

export function stripLocale(path: string): string {
    return path.replace(/^\/(en|el)(?=\/|\?|#|$)/, "") || "/"
}

export function localizeHref(href: string, locale: Locale): string {
    if (
        !href.startsWith("/") ||
        href.startsWith("//") ||
        /^\/api(?:\/|$)/.test(href)
    )
        return href
    const path = stripLocale(href)
    return `/${locale}${path === "/" ? "" : path.startsWith("/") ? path : `/${path}`}`
}

export function preferredLocale(
    cookie: string | undefined,
    acceptLanguage: string | null
): Locale {
    if (isLocale(cookie)) return cookie
    const requested = (acceptLanguage || "")
        .split(",")
        .map((entry, index) => {
            const [tag, ...parameters] = entry.trim().split(";")
            const quality = parameters.find((part) =>
                part.trim().startsWith("q=")
            )
            return {
                tag: tag.toLowerCase().split("-")[0],
                quality: quality ? Number(quality.trim().slice(2)) : 1,
                index,
            }
        })
        .filter(
            ({ quality }) =>
                Number.isFinite(quality) && quality > 0 && quality <= 1
        )
        .sort((a, b) => b.quality - a.quality || a.index - b.index)
    return (
        (requested.find(({ tag }) => isLocale(tag))?.tag as
            Locale | undefined) ?? defaultLocale
    )
}

export function intlLocale(locale: Locale): string {
    return locale === "el" ? "el-GR" : "en-GB"
}
