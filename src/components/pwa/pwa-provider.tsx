"use client"

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react"
import { useTheme } from "next-themes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type InstallPrompt = Event & {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const PwaContext = createContext({
    installed: false,
    canInstall: false,
    install: async () => {},
    offline: false,
    updateAvailable: false,
    updating: false,
    update: () => {},
})

export const usePwa = () => useContext(PwaContext)

export function PwaProvider({ children }: { children: ReactNode }) {
    const [installed, setInstalled] = useState(false)
    const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
    const [offline, setOffline] = useState(false)
    const [updateAvailable, setUpdateAvailable] = useState(false)
    const [updating, setUpdating] = useState(false)
    const registration = useRef<ServiceWorkerRegistration | null>(null)
    const reloadRequested = useRef(false)
    const { resolvedTheme } = useTheme()

    useEffect(() => {
        // Also follow the in-app theme override, which can differ from the OS.
        const color = resolvedTheme === "dark" ? "#141c18" : "#fafbf8"
        document
            .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
            .forEach((meta) => {
                meta.content = color
            })
    }, [resolvedTheme])

    useEffect(() => {
        const displayMode = window.matchMedia("(display-mode: standalone)")
        const checkInstalled = () =>
            setInstalled(
                displayMode.matches ||
                    (navigator as Navigator & { standalone?: boolean })
                        .standalone === true
            )
        const connectivity = () => setOffline(!navigator.onLine)
        const beforeInstall = (event: Event) => {
            event.preventDefault()
            setPrompt(event as InstallPrompt)
        }
        const appInstalled = () => {
            setInstalled(true)
            setPrompt(null)
        }
        checkInstalled()
        connectivity()
        displayMode.addEventListener("change", checkInstalled)
        window.addEventListener("online", connectivity)
        window.addEventListener("offline", connectivity)
        window.addEventListener("beforeinstallprompt", beforeInstall)
        window.addEventListener("appinstalled", appInstalled)
        return () => {
            displayMode.removeEventListener("change", checkInstalled)
            window.removeEventListener("online", connectivity)
            window.removeEventListener("offline", connectivity)
            window.removeEventListener("beforeinstallprompt", beforeInstall)
            window.removeEventListener("appinstalled", appInstalled)
        }
    }, [])

    useEffect(() => {
        // Keep the worker out of next dev and its hot-reload lifecycle.
        if (
            process.env.NODE_ENV !== "production" ||
            !("serviceWorker" in navigator)
        )
            return
        let stopped = false
        let detachWorker = () => {}
        let detachRegistration = () => {}
        let hadController = !!navigator.serviceWorker.controller
        const controllerChanged = () => {
            if (reloadRequested.current) window.location.reload()
            else if (hadController) setUpdateAvailable(true)
            hadController = true
        }
        let lastCheck = 0
        const checkForUpdate = () => {
            if (
                document.visibilityState !== "visible" ||
                !navigator.onLine ||
                Date.now() - lastCheck < 60_000
            )
                return
            lastCheck = Date.now()
            void registration.current?.update().catch(() => {})
        }
        navigator.serviceWorker.addEventListener(
            "controllerchange",
            controllerChanged
        )
        document.addEventListener("visibilitychange", checkForUpdate)
        window.addEventListener("online", checkForUpdate)
        void navigator.serviceWorker
            .register("/sw.js", { scope: "/", updateViaCache: "none" })
            .then((value) => {
                if (stopped) return
                registration.current = value
                if (value.waiting) setUpdateAvailable(true)
                const watchInstalling = () => {
                    detachWorker()
                    const worker = value.installing
                    if (!worker) return
                    const stateChanged = () => {
                        if (
                            worker.state === "installed" &&
                            navigator.serviceWorker.controller
                        )
                            setUpdateAvailable(true)
                    }
                    worker.addEventListener("statechange", stateChanged)
                    detachWorker = () =>
                        worker.removeEventListener("statechange", stateChanged)
                    stateChanged()
                }
                value.addEventListener("updatefound", watchInstalling)
                detachRegistration = () =>
                    value.removeEventListener("updatefound", watchInstalling)
                watchInstalling()
                checkForUpdate()
            })
            .catch(() => {
                // Installation/offline support is an enhancement; the website stays usable.
            })
        return () => {
            stopped = true
            detachWorker()
            detachRegistration()
            navigator.serviceWorker.removeEventListener(
                "controllerchange",
                controllerChanged
            )
            document.removeEventListener("visibilitychange", checkForUpdate)
            window.removeEventListener("online", checkForUpdate)
        }
    }, [])

    async function install() {
        if (!prompt) return
        try {
            await prompt.prompt()
            await prompt.userChoice
        } finally {
            setPrompt(null)
        }
    }

    function update() {
        if (offline || updating) return
        const waiting = registration.current?.waiting
        if (waiting) {
            setUpdating(true)
            reloadRequested.current = true
            waiting.postMessage({ type: "SKIP_WAITING" })
        } else window.location.reload()
    }

    return (
        <PwaContext.Provider
            value={{
                installed,
                canInstall: !!prompt,
                install,
                offline,
                updateAvailable,
                updating,
                update,
            }}
        >
            {children}
        </PwaContext.Provider>
    )
}

export function PwaStatus() {
    const { offline, updateAvailable, updating, update } = usePwa()
    if (!offline && !updateAvailable) return null
    return (
        <div className="mb-4 flex flex-col gap-3">
            {offline && (
                <Alert role="status">
                    <AlertTitle>You’re offline</AlertTitle>
                    <AlertDescription>
                        Loaded data may be out of date. Reconnect before saving
                        changes.
                    </AlertDescription>
                </Alert>
            )}
            {updateAvailable && (
                <Alert role="status">
                    <AlertTitle>A new version is ready</AlertTitle>
                    <AlertDescription>
                        Finish and save any changes in your open tabs before
                        updating.
                        <div className="mt-3">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={offline || updating}
                                onClick={update}
                            >
                                {updating ? "Updating…" : "Update and reload"}
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    )
}
