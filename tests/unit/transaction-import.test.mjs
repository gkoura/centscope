import test from "node:test"
import assert from "node:assert/strict"
import {
    parseCsv,
    previewTransactionImport,
    importColumns,
} from "../../src/lib/transaction-import.ts"
import { parseTransactionFilters } from "../../src/lib/transaction-filters.ts"
const wallets = [{ id: "wallet", name: "Everyday wallet", currency: "EUR" }]
const categories = [
    { id: "food", name: "Food & drink", type: "EXPENSE", parentId: null },
    { id: "coffee", name: "Coffee", type: "EXPENSE", parentId: "food" },
    { id: "salary", name: "Salary", type: "INCOME", parentId: null },
]
const header = importColumns.join(",")
const row =
    "2026-11-03,Lunch,EXPENSE,12.50,Everyday wallet,Food & drink,,POSTED,"
const preview = (text) =>
    previewTransactionImport(text, "account", wallets, categories)
test("parses BOM, CRLF, quoted commas, escaped quotes, embedded line breaks and empty cells", () => {
    assert.deepEqual(
        parseCsv(
            '\uFEFFa,b,c\r\n"a,b","say ""hello""","line1\r\nline2"\r\n,,\r\n'
        ),
        [
            ["a", "b", "c"],
            ["a,b", 'say "hello"', "line1\nline2"],
        ]
    )
    for (const text of ['a,"unclosed', 'a,"closed"extra', 'ab"cd,ef'])
        assert.throws(() => parseCsv(text), /quot/)
})
test("validates exact template, existing wallet/category, subcategory and exact money", () => {
    const result = preview(
        `${header}\n${row}\n2026-11-04,Coffee,EXPENSE,3.2,everyday WALLET,food & drink,Coffee,PENDING,Note\n`
    )
    assert.deepEqual(result.errors, [])
    assert.equal(result.rows.length, 2)
    assert.equal(result.rows[1].categoryId, "coffee")
    assert.equal(result.rows[1].amount, "3.20")
    assert.equal(result.rows[1].status, "PENDING")
    assert.ok(preview(`wrong,header\n${row}`).errors.length)
    assert.ok(preview(header).errors.length)
})
test("rejects unknown/ambiguous wallets, mismatched categories, invalid statuses/dates and precision", () => {
    for (const invalid of [
        row.replace("Everyday wallet", "Unknown"),
        row.replace("Food & drink", "Salary"),
        row.replace("12.50", "-12.50"),
        row.replace("12.50", "0.001"),
        row.replace("POSTED", "SCHEDULED"),
        row.replace("2026-11-03", "2026-02-30"),
        `${row},extra`,
    ])
        assert.ok(preview(`${header}\n${invalid}`).errors.length, invalid)
    assert.ok(
        previewTransactionImport(
            `${header}\n${row}`,
            "account",
            [...wallets, { ...wallets[0], id: "duplicate" }],
            categories
        ).errors.length
    )
    const mixed = preview(`${header}\n${row}\n${row.replace("12.50", "NaN")}`)
    assert.equal(mixed.rows.length, 1)
    assert.match(mixed.errors[0], /^Row 3:/)
})
test("limits file bytes and row count before any write", () => {
    assert.throws(() => parseCsv("é".repeat(1000001)), /2 MB/)
    assert.ok(
        preview(`${header}\n${Array(2001).fill(row).join("\n")}`).errors.length
    )
    assert.equal(
        preview(`${header}\n${Array(2000).fill(row).join("\n")}`).rows.length,
        2000
    )
})
test("filters accept valid server-side constraints and reject malformed query values", () => {
    const filters = parseTransactionFilters({
        q: " lunch ",
        status: "POSTED",
        type: "EXPENSE",
        from: "2026-02-30",
        to: "2026-11-03",
        wallet: ["bad"],
        category: "food",
    })
    assert.equal(filters.q, "lunch")
    assert.equal(filters.from, undefined)
    assert.equal(filters.to, "2026-11-03")
    assert.equal(filters.wallet, undefined)
    assert.equal(filters.category, "food")
    assert.equal(
        parseTransactionFilters({ type: "ADJUSTMENT", status: "whatever" }).type,
        undefined
    )
})
