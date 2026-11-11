"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { useWorkspaceScope } from "@/components/workspace/workspace-cache-provider"
import { budgetCadences, type BudgetCadence } from "@/lib/budget-period"

const eventName = "centscope:budget-sections"
// Retain interactive behavior if the browser denies storage or its quota is full.
const unsaved = new Map<string, string>()
const serverSnapshot = () => ""

function read(key: string) {
    if (!key) return ""
    if (unsaved.has(key)) return unsaved.get(key)!
    try {
        return localStorage.getItem(key) ?? ""
    } catch {
        return ""
    }
}
function parse(raw: string): Partial<Record<BudgetCadence, boolean>> {
    try {
        const value = JSON.parse(raw)
        return Object.fromEntries(
            budgetCadences
                .filter((cadence) => value?.[cadence] === true)
                .map((cadence) => [cadence, true])
        )
    } catch {
        return {}
    }
}

export function useBudgetSectionPreferences(accountId: string) {
    const { userId } = useWorkspaceScope()
    const key = userId
        ? `centscope:budget-sections:v1:${JSON.stringify([userId, accountId])}`
        : ""
    const subscribe = useCallback(
        (update: () => void) => {
            const local = (event: Event) => {
                if ((event as CustomEvent<string>).detail === key) update()
            }
            const otherTab = (event: StorageEvent) => {
                if (event.key === key || event.key === null) {
                    unsaved.delete(key)
                    update()
                }
            }
            window.addEventListener(eventName, local)
            window.addEventListener("storage", otherTab)
            return () => {
                window.removeEventListener(eventName, local)
                window.removeEventListener("storage", otherTab)
            }
        },
        [key]
    )
    const getSnapshot = useCallback(() => read(key), [key])
    const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot)
    const collapsed = useMemo(() => parse(raw), [raw])
    const setExpanded = useCallback(
        (cadence: BudgetCadence, expanded: boolean) => {
            if (!key) return
            const next = parse(read(key))
            if (expanded) delete next[cadence]
            else next[cadence] = true
            const value = JSON.stringify(next)
            try {
                localStorage.setItem(key, value)
                unsaved.delete(key)
            } catch {
                unsaved.set(key, value)
            }
            window.dispatchEvent(new CustomEvent(eventName, { detail: key }))
        },
        [key]
    )
    return {
        isExpanded: (cadence: BudgetCadence) => !collapsed[cadence],
        setExpanded,
    }
}
