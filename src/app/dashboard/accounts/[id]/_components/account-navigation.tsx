import { CachedAccountNavigation } from "@/components/workspace/cached-account-navigation"
export async function AccountNavigationContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    return <CachedAccountNavigation accountId={(await params).id} />
}
