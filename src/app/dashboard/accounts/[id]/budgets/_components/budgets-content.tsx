import { BudgetManager } from "@/components/financial-accounts/budget-manager"
export async function BudgetsContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    return <BudgetManager accountId={(await params).id} />
}
