import { LOCALE_COOKIE, preferredLocale } from "./config.ts"

/** Auth callbacks receive the original request, including background email work. */
export function requestLocale(request?: Request) {
    const cookie = request?.headers
        .get("cookie")
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
        ?.slice(LOCALE_COOKIE.length + 1)
    return preferredLocale(
        cookie,
        request?.headers.get("accept-language") ?? null
    )
}
