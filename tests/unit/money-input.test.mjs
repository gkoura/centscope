import test from "node:test"
import assert from "node:assert/strict"
import {
    moneyInputLocale,
    parseMoneyPaste,
    validMoneyDraft,
} from "../../src/lib/money-input.ts"

test("uses browser-locale separators and grouping patterns", () => {
    assert.deepEqual(moneyInputLocale("en-US"), {
        decimal: ".",
        group: ",",
        grouping: "thousand",
    })
    assert.deepEqual(moneyInputLocale("el-GR"), {
        decimal: ",",
        group: ".",
        grouping: "thousand",
    })
    assert.equal(moneyInputLocale("fr-FR").decimal, ",")
    assert.equal(moneyInputLocale("en-IN").grouping, "lakh")
})

test("pastes locale-formatted and unformatted amounts without floating-point conversion", () => {
    for (const [locale, raw, expected] of [
        ["en-US", "1,356.78", "1356.78"],
        ["el-GR", "1.356,78", "1356.78"],
        ["el-GR", "1356.78", "1356.78"],
        ["en-US", "1356,78", "1356.78"],
        ["fr-FR", "1\u202f356,78", "1356.78"],
        ["fr-FR", "1 356,78", "1356.78"],
        ["en-IN", "12,34,567.89", "1234567.89"],
        ["el-GR", "9.999.999.999.999.999,99", "9999999999999999.99"],
        ["en-US", "9,999,999,999,999,999.99", "9999999999999999.99"],
    ])
        assert.equal(
            parseMoneyPaste(raw, locale),
            expected,
            `${locale}: ${raw}`
        )
})

test("rejects malformed grouping, currencies, signs, excess precision and overflow on paste", () => {
    for (const [locale, raw] of [
        ["en-US", "13.591"],
        ["el-GR", "13,591"],
        ["en-US", "12,34.56"],
        ["el-GR", "12.34,56"],
        ["en-US", "€13.59"],
        ["el-GR", "-13,59"],
        ["en-US", "1e3"],
        ["el-GR", "13,,59"],
        ["en-US", "10000000000000000"],
        ["el-GR", "10.000.000.000.000.000,00"],
    ])
        assert.equal(parseMoneyPaste(raw, locale), null, `${locale}: ${raw}`)
})

test("editing preserves empty and unfinished decimals while enforcing exact storage bounds", () => {
    for (const value of ["", "13.", "13.5", "1356.78", "9999999999999999.99"])
        assert.equal(validMoneyDraft(value), true)
    for (const value of [
        "13.591",
        "10000000000000000",
        "-13.59",
        "1,356.78",
        "NaN",
    ])
        assert.equal(validMoneyDraft(value), false)
})
