"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import { Skeleton } from "@/components/ui/skeleton"

export function SectionLoading({ label = "Loading…" }: { label?: string }) {
    const t = useTranslations()

    return (
        <div role="status" className="flex flex-col gap-4">
            <span className="sr-only">{t(label || "")}</span>
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
    )
}
