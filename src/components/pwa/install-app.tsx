"use client"

import { useState } from "react"
import { usePwa } from "./pwa-provider"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export function InstallApp() {
    const { installed, canInstall, install, offline } = usePwa()
    const [pending, setPending] = useState(false)
    const [failed, setFailed] = useState(false)

    async function handleInstall() {
        setPending(true)
        setFailed(false)
        try {
            await install()
        } catch {
            setFailed(true)
        } finally {
            setPending(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Install CentScope</CardTitle>
                <CardDescription>
                    Open CentScope from your home screen or desktop in its own
                    window.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {installed ? (
                    <p role="status">You’re using the installed app.</p>
                ) : canInstall ? (
                    <Button
                        type="button"
                        className="self-start"
                        onClick={() => void handleInstall()}
                        disabled={pending || offline}
                    >
                        {pending ? "Opening installer…" : "Install app"}
                    </Button>
                ) : (
                    <div className="flex flex-col gap-2 text-sm">
                        <p>
                            On iPhone or iPad, open CentScope in Safari, tap
                            Share, then Add to Home Screen.
                        </p>
                        <p>
                            On Android or desktop, open your browser menu and
                            look for Install app or Add to Home Screen.
                            Availability depends on your browser.
                        </p>
                    </div>
                )}
                {failed && (
                    <p role="status">
                        Couldn’t open the installer. Try installing from your
                        browser menu.
                    </p>
                )}
                <p className="text-sm text-muted-foreground">
                    An internet connection is needed to open your workspace and
                    save changes.
                </p>
            </CardContent>
        </Card>
    )
}
