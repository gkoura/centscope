import greek from "./el.json" with { type: "json" }
import type { Locale } from "./config.ts"

export function translate(
    locale: Locale,
    message: string,
    values?: Record<string, string | number>
): string {
    const text =
        locale === "el" && Object.hasOwn(greek, message)
            ? (greek as Record<string, string>)[message]
            : message
    return values
        ? text.replace(/\{(\w+)\}/g, (match, key: string) =>
              String(values[key] ?? match)
          )
        : text
}

export function createTranslator(locale: Locale) {
    return (message: string, values?: Record<string, string | number>) =>
        translate(locale, message, values)
}

export function translateObject<T>(value: T, locale: Locale): T {
    if (typeof value === "string") return translate(locale, value) as T
    if (Array.isArray(value))
        return value.map((item) => translateObject(item, locale)) as T
    if (value && typeof value === "object")
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
                key,
                translateObject(item, locale),
            ])
        ) as T
    return value
}
