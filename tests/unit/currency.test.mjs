import test from "node:test"
import assert from "node:assert/strict"
import {
    appendCurrencySymbol,
    currencySymbol,
    currencyLabel,
    currencyOptions,
} from "../../src/lib/currency.ts"
import { walletCurrencies } from "../../src/lib/wallet-input.ts"
import {
    reportingCurrencies,
    validateFinancialAccountInput,
} from "../../src/lib/financial-account-input.ts"

test("uses symbols for all supported currencies and readable names for selections", () => {
    for (const [code, symbol, label] of [
        ["EUR", "€", "€ — Euro"],
        ["GBP", "£", "£ — British pound"],
        ["USD", "$", "$ — US dollar"],
    ]) {
        assert.equal(currencySymbol(code), symbol)
        assert.equal(currencyLabel(code), label)
    }
    assert.equal(currencySymbol(""), "")
    assert.equal(currencySymbol("XYZ"), "XYZ")
})

test("wallet and reporting-currency options keep canonical codes as form values", () => {
    assert.deepEqual(walletCurrencies, currencyOptions)
    assert.deepEqual(reportingCurrencies, currencyOptions)
    for (const { value, label } of reportingCurrencies) {
        assert.equal(label.includes(value), false)
        const form = new FormData()
        form.set("name", "Personal")
        form.set("reportingCurrency", value)
        assert.equal(
            validateFinancialAccountInput(form).data.reportingCurrency,
            value
        )
    }
})

test("places currency symbols after ordinary and compact amounts", () => {
    assert.equal(appendCurrencySymbol("13.57", "USD"), "13.57 $")
    assert.equal(appendCurrencySymbol("-13.57", "EUR"), "-13.57 €")
    assert.equal(appendCurrencySymbol("1.2K", "GBP"), "1.2K £")
})
