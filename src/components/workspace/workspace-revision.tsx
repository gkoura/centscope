"use client"
import { useEffect, useRef } from "react"
import { publishWorkspaceEvent } from "@/lib/workspace-cache-events"

export function WorkspaceRevision({ revision }: { revision: string }) {
    const previous = useRef(revision)
    useEffect(() => {
        if (previous.current !== revision)
            publishWorkspaceEvent({ type: "changed" })
        previous.current = revision
    }, [revision])
    return null
}
