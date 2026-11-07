import { getTranslations } from "@/lib/i18n/server"
import { Skeleton } from "@/components/ui/skeleton"
export default async function AuthLoading() {
    const t = await getTranslations()

    return (
        <div role="status" className="flex flex-col gap-6">
            <span className="sr-only">{t("Loading sign-in options…")}</span>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
        </div>
    )
}
