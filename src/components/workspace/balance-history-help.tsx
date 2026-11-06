"use client"

import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover"

export function BalanceHistoryHelp() {
    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                delay={200}
                closeDelay={150}
                render={<Button variant="ghost" size="icon" className="size-11" />}
                aria-label="How smoothed balance works"
            >
                <Info aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-80 max-w-[calc(100vw-2rem)] gap-3 p-4 text-sm leading-relaxed motion-reduce:animate-none"
            >
                <PopoverTitle>How smoothed balance works</PopoverTitle>
                <p>
                    This chart shows a running balance at the end of each month,
                    using posted entries only. Pending transactions are excluded.
                </p>
                <p>
                    Spread expenses count a little each month across their assigned
                    months, instead of all at once on the payment date. For example,
                    a 1,200 € expense spread over 12 months reduces this balance by
                    100 € each month.
                </p>
                <p>
                    Your total balance reflects the actual money in your wallets,
                    including the full payment when it posts. That’s why it can
                    differ from this chart. Spreading changes the analysis, not
                    your money.
                </p>
                <p className="text-muted-foreground">
                    Current and future months show recorded entries so far, not a
                    forecast. Each currency is shown separately.
                </p>
            </PopoverContent>
        </Popover>
    )
}
