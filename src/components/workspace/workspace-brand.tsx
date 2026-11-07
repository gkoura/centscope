"use client"

import { useTranslations } from "@/components/i18n/locale-provider"

import Link from "@/components/i18n/link"
import { Brand } from "@/components/site/brand"
import { useWorkspaceQuery } from "./use-workspace-query"

export function WorkspaceBrand({ compact = false }: { compact?: boolean }) {
    const t = useTranslations()

    const { data } = useWorkspaceQuery("accounts")
    const href = data?.[0] ? `/dashboard/accounts/${data[0].id}` : "/dashboard"
    return compact ? (
        <Link href={href} className="font-semibold tracking-tight">
            {t("CentScope")}
            <span className="text-primary">.</span>
        </Link>
    ) : (
        <Brand href={href} />
    )
}
