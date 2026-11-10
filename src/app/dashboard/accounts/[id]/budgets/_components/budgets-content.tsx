import { BudgetManager } from "@/components/financial-accounts/budget-manager"
export async function BudgetsContent({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const [{ id }, query] = await Promise.all([params, searchParams])
    return (
        <BudgetManager
            accountId={id}
            requestedPeriods={Object.fromEntries(
                Object.entries(query).filter(
                    (entry): entry is [string, string] =>
                        typeof entry[1] === "string"
                )
            )}
        />
    )
}
