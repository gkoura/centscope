"use client"
import Link from "next/link"
import { Brand } from "@/components/site/brand"
import { useWorkspaceQuery } from "./use-workspace-query"

export function WorkspaceBrand({ compact = false }: { compact?: boolean }) {
    const { data } = useWorkspaceQuery("accounts")
    const href = data?.[0] ? `/dashboard/accounts/${data[0].id}` : "/dashboard"
    return compact ? (
        <Link href={href} className="font-semibold tracking-tight">
            fintrack<span className="text-primary">.</span>
        </Link>
    ) : (
        <Brand href={href} />
    )
}
