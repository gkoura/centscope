"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import Link from "@/components/i18n/link"
import { ChartNoAxesColumnIncreasing } from "lucide-react"

export function Brand({ href = "/" }: { href?: string }) {
    const t = useTranslations()

    return (
        <Link
            href={href}
            className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight"
            aria-label={
                href === "/" ? t("CentScope home") : t("CentScope dashboard")
            }
        >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ChartNoAxesColumnIncreasing
                    className="size-5"
                    aria-hidden="true"
                />
            </span>
            {t("CentScope")}
            <span className="text-primary">.</span>
        </Link>
    )
}
