import { Suspense } from "react"
import AuthLoading from "../loading"
import { AuthContent } from "./_components/auth-content"

export default function AuthPage({
    params,
}: {
    params: Promise<{ path: string }>
}) {
    return (
        <Suspense fallback={<AuthLoading />}>
            <AuthContent params={params} />
        </Suspense>
    )
}
