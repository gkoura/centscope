import Link from "next/link"
import { ChartNoAxesColumnIncreasing } from "lucide-react"

export function Brand({ href = "/" }: { href?: "/" | "/dashboard" }) {
    return (
        <Link
            href={href}
            className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight"
            aria-label={
                href === "/dashboard" ? "Fintrack dashboard" : "Fintrack home"
            }
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
