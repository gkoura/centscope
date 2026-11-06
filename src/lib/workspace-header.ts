/** Account detail routes have their own selector toolbar; list/create/settings routes use the shared header. */
export function usesAccountHeader(pathname: string): boolean {
    return /^\/dashboard\/accounts\/(?!new(?:\/|$))[^/]+(?:\/|$)/.test(pathname)
}
