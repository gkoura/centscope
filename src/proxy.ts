import { NextRequest, NextResponse } from "next/server"
import { isLocale, LOCALE_COOKIE, preferredLocale } from "@/lib/i18n/config"

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const segment = pathname.split("/")[1]
    if (isLocale(segment)) {
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set("x-centscope-locale", segment)
        const response = NextResponse.next({
            request: { headers: requestHeaders },
        })
        response.cookies.set(LOCALE_COOKIE, segment, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        })
        return response
    }
    const locale = preferredLocale(
        request.cookies.get(LOCALE_COOKIE)?.value,
        request.headers.get("accept-language")
    )
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`
    return NextResponse.redirect(url)
}

export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"] }
