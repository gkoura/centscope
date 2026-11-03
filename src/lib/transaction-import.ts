import {
    validateTransactionInput,
    type TransactionInput,
} from "./transaction-input.ts"

export const MAX_IMPORT_ROWS = 2_000
export const MAX_IMPORT_BYTES = 2_000_000

export const importColumns = [
    "date",
    "name",
    "type",
    "amount",
    "wallet",
    "category",
    "subcategory",
    "status",
    "notes",
] as const
export const sampleTransactionCsv = `${importColumns.join(",")}\n2026-11-01,Weekly groceries,EXPENSE,42.50,Everyday wallet,Food & drink,,POSTED,Example expense\n2026-11-02,Salary,INCOME,2500.00,Everyday wallet,Salary,,POSTED,Example income\n2026-11-03,Coffee,EXPENSE,3.20,Everyday wallet,Food & drink,,PENDING,Example pending expense\n`
export type ImportWallet = { id: string; name: string; currency: string }
export type ImportCategory = {
    id: string
    name: string
    type: string
    parentId: string | null
}
export type ImportPreview = { rows: TransactionInput[]; errors: string[] }

// RFC 4180 quoting, including escaped quotes and embedded newlines.
export function parseCsv(text: string): string[][] {
    if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
        throw new Error("Choose a CSV smaller than 2 MB.")
    const records: string[][] = []
    let row: string[] = [],
        field = "",
        quoted = false,
        closed = false
    const addField = () => {
        row.push(field)
        field = ""
        closed = false
    }
    const addRow = () => {
        addField()
        if (row.some((cell) => cell.trim())) records.push(row)
        row = []
        if (records.length > MAX_IMPORT_ROWS + 1)
            throw new Error("Import at most 2,000 transactions at a time.")
    }
    const source = text
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
    for (let i = 0; i < source.length; i++) {
        const char = source[i]
        if (quoted) {
            if (char === '"' && source[i + 1] === '"') {
                field += '"'
                i++
            } else if (char === '"') {
                quoted = false
                closed = true
            } else field += char
        } else if (char === ",") addField()
        else if (char === "\n") addRow()
        else if (char === '"' && !field && !closed) quoted = true
        else if (closed || char === '"')
            throw new Error(
                "Invalid CSV quoting. Wrap cells containing commas or newlines in double quotes."
            )
        else field += char
    }
    if (quoted)
        throw new Error("A quoted CSV cell is missing its closing quote.")
    if (field || row.length || closed) addRow()
    return records
}

export function previewTransactionImport(
    text: string,
    financialAccountId: string,
    wallets: ImportWallet[],
    categories: ImportCategory[]
): ImportPreview {
    let records: string[][]
    try {
        records = parseCsv(text)
    } catch (error) {
        return {
            rows: [],
            errors: [
                error instanceof Error ? error.message : "Unable to read CSV.",
            ],
        }
    }
    const header = records.shift()
    if (!header || header.join(",") !== importColumns.join(","))
        return {
            rows: [],
            errors: [
                `Use the template header exactly: ${importColumns.join(",")}`,
            ],
        }
    if (!records.length)
        return {
            rows: [],
            errors: ["Add at least one transaction below the header."],
        }
    const rows: TransactionInput[] = [],
        errors: string[] = []
    const match = (a: string, b: string) =>
        a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()
    records.forEach((cells, index) => {
        const label = `Row ${index + 2}`
        if (cells.length !== importColumns.length) {
            errors.push(`${label}: expected ${importColumns.length} columns.`)
            return
        }
        const [
            date,
            name,
            type,
            amount,
            wallet,
            category,
            subcategory,
            status,
            notes,
        ] = cells.map((value) => value.trim())
        const walletMatches = wallets.filter((item) => match(item.name, wallet))
        if (walletMatches.length !== 1) {
            errors.push(
                `${label}: wallet “${wallet}” must match exactly one available wallet.`
            )
            return
        }
        const parents = categories.filter(
            (item) =>
                !item.parentId &&
                item.type === type &&
                match(item.name, category)
        )
        const matches = subcategory
            ? categories.filter(
                  (item) =>
                      item.parentId === parents[0]?.id &&
                      parents.length === 1 &&
                      item.type === type &&
                      match(item.name, subcategory)
              )
            : parents
        if (matches.length !== 1) {
            errors.push(
                `${label}: category/subcategory must match an existing ${type || "transaction"} category.`
            )
            return
        }
        const form = new FormData()
        Object.entries({
            financialAccountId,
            accountWalletId: walletMatches[0].id,
            categoryId: matches[0].id,
            requestId: "00000000-0000-4000-8000-000000000000",
            date,
            name,
            type,
            amount,
            status,
            notes,
        }).forEach(([key, value]) => form.set(key, value))
        const result = validateTransactionInput(form)
        if (!result.data)
            errors.push(`${label}: ${Object.values(result.errors).join(" ")}`)
        else rows.push(result.data)
    })
    return { rows, errors }
}
