"use client"

import { useEffect } from "react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div role="alert" className="space-y-4">
            <h2>Something went wrong.</h2>
            <button type="button" onClick={() => reset()}>
                Try again
            </button>
        </div>
    )
}
