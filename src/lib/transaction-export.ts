/** Stable, locale-independent CSV report. Amounts remain exact decimal strings. */
export const transactionExportColumns = [
    "date",
    "name",
    "type",
    "amount",
    "wallet",
    "category",
    "subcategory",
    "status",
    "notes",
    "currency",
    "destination_wallet",
    "destination_amount",
    "destination_currency",
    "spread_start_month",
    "spread_month_count",
    "recurring_series_id",
    "transaction_id",
] as const

export type ExportTransaction = {
    id: string
    date: string
    name: string
    type: string
    status: string
    amount: string
    currency: string
    walletName: string
    notes: string | null
    categoryName: string | null
    subcategoryName: string | null
    expenseSpread: { startMonth: string; monthCount: number } | null
    occurrence: { ruleId: string } | null
    transfer: {
        source: { walletName: string; amount: string; currency: string }
        destination: { walletName: string; amount: string; currency: string }
    } | null
}

// Quoting alone does not prevent spreadsheet formula execution. Only text cells
// need protection; trusted numeric values (including negative openings) stay numeric.
export function csvCell(value: string, text = true) {
    const safe =
        text && /^[\s\uFEFF]*[=+\-@\t\r\n]/.test(value) ? `'${value}` : value
    return `"${safe.replaceAll('"', '""')}"`
}
export function transactionCsvRow(row: ExportTransaction) {
    const source = row.transfer?.source
    const destination = row.transfer?.destination
    const cells = [
        row.date,
        row.name,
        row.type,
        source?.amount ??
            (row.type === "EXPENSE"
                ? row.amount.replace(/^-/, "")
                : row.amount),
        source?.walletName ?? row.walletName,
        row.categoryName ?? "",
        row.subcategoryName ?? "",
        row.status,
        row.notes ?? "",
        source?.currency ?? row.currency,
        destination?.walletName ?? "",
        destination?.amount ?? "",
        destination?.currency ?? "",
        row.expenseSpread?.startMonth ?? "",
        row.expenseSpread?.monthCount.toString() ?? "",
        row.occurrence?.ruleId ?? "",
        row.id,
    ]
    return (
        cells
            .map((cell, index) => csvCell(cell, ![3, 11, 14].includes(index)))
            .join(",") + "\r\n"
    )
}
export function transactionsCsv(rows: ExportTransaction[]) {
    return (
        "\uFEFF" +
        transactionExportColumns.join(",") +
        "\r\n" +
        rows.map(transactionCsvRow).join("")
    )
}
