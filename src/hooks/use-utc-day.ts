"use client"

import { useSyncExternalStore } from "react"

function subscribeDay(update: () => void) {
    const timer = setInterval(update, 60_000)
    window.addEventListener("focus", update)
    return () => {
        clearInterval(timer)
        window.removeEventListener("focus", update)
    }
}

const utcDay = () => new Date().toISOString().slice(0, 10)
const serverDay = () => ""

export function useUtcDay() {
    return useSyncExternalStore(subscribeDay, utcDay, serverDay)
}
