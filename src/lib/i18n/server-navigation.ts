import "server-only"
import { headers, cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
    isLocale,
    LOCALE_COOKIE,
    localizeHref,
    preferredLocale,
} from "./config"

/** Works in Server Actions as well as request-specific Server Components. */
export async function getRequestLocale() {
    const requestHeaders = await headers()
    const requested = requestHeaders.get("x-centscope-locale") ?? undefined
    return isLocale(requested)
        ? requested
        : preferredLocale(
              (await cookies()).get(LOCALE_COOKIE)?.value,
              requestHeaders.get("accept-language")
          )
}

export async function redirectLocalized(path: string): Promise<never> {
    redirect(localizeHref(path, await getRequestLocale()))
}
