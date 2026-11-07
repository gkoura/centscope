import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { AccountNavigationContent } from "./_components/account-navigation"
export default function AccountLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    return (
        <div className="account-area">
            <Suspense
                fallback={
                    <div className="account-toolbar">
                        <div className="account-toolbar-inner">
                            <Skeleton className="h-11 w-48" />
                        </div>
                    </div>
                }
            >
                <AccountNavigationContent params={params} />
            </Suspense>
            {children}
        </div>
    )
}
