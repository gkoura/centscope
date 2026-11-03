"use client"
import Link from "next/link"
import { CircleAlert, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
export function RouteError({ retry }: { retry: () => void }) {
    return (
        <div
            role="alert"
            className="mx-auto flex max-w-lg flex-col items-start gap-5 px-6 py-16"
        >
            <CircleAlert className="size-8 text-muted-foreground" />
            <h2 className="text-2xl font-medium tracking-tight">
                Let’s give that another try.
            </h2>
            <p className="text-sm leading-7 text-muted-foreground">
                We couldn’t load this page. Try again, or return home to start
                fresh.
            </p>
            <div className="flex items-center gap-4">
                <Button onClick={retry}>
                    <RotateCcw data-icon="inline-start" />
                    Try again
                </Button>
                <Link href="/" className="text-sm underline underline-offset-4">
                    Back to home
                </Link>
            </div>
        </div>
    )
}
