import Link from "next/link"
import { ChartNoAxesColumnIncreasing } from "lucide-react"

export function Brand() {
    return (
        <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight"
            aria-label="Fintrack home"
        >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ChartNoAxesColumnIncreasing
                    className="size-5"
                    aria-hidden="true"
                />
            </span>
            fintrack<span className="text-primary">.</span>
        </Link>
    )
}
