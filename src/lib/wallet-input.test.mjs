import test from "node:test"
import assert from "node:assert/strict"
import {
    parseOpeningBalance,
    validateWalletInput,
    formatWalletMoney,
} from "./wallet-input.ts"

function input(overrides = {}) {
    const data = new FormData()
    for (const [key, value] of Object.entries({
        financialAccountId: "test-account",
        requestId: "6fde415d-23ec-453e-b24c-65c8cd005bf0",
        name: "  Everyday bank  ",
        type: "BANK",
        currency: "GBP",
        openingBalance: "125.50",
        openingDate: "2026-11-03",
        openingStatus: "POSTED",
        ...overrides,
    }))
        data.set(key, value)
    return data
}

test("money remains exact at the storage limit and for fractional/negative amounts", () => {
    for (const [raw, expected] of [
        ["", "0.00"],
        ["-0.00", "0.00"],
        ["0.10", "0.10"],
        ["-125.5", "-125.50"],
        ["9999999999999999.99", "9999999999999999.99"],
    ]) {
        assert.equal(parseOpeningBalance(raw), expected)
    }
})

test("rejects excessive precision, overflow, exponent notation, grouping and non-finite money", () => {
    for (const raw of [
        "0.001",
        "10000000000000000",
        "1e3",
        "1,000.00",
        "NaN",
        "Infinity",
        "--1",
        "1.2.3",
    ])
        assert.equal(parseOpeningBalance(raw), null, raw)
})

test("dates do not force status, including future posted and past pending balances", () => {
    const future = validateWalletInput(
        input({ openingDate: "2099-12-31", openingStatus: "POSTED" })
    )
    const past = validateWalletInput(
        input({ openingDate: "2000-01-01", openingStatus: "PENDING" })
    )
    assert.equal(future.data?.openingStatus, "POSTED")
    assert.equal(past.data?.openingStatus, "PENDING")
    assert.equal(future.data?.name, "Everyday bank")
})

test("rejects impossible dates, malformed IDs and unsupported enum values", () => {
    for (const [key, value] of [
        ["openingDate", "2026-02-30"],
        ["openingDate", "0000-01-01"],
        ["requestId", "not-a-uuid"],
        ["currency", "XYZ"],
        ["type", "CREDIT"],
        ["openingStatus", "SCHEDULED"],
        ["name", " "],
    ]) {
        assert.ok(
            validateWalletInput(input({ [key]: value })).errors?.[key],
            `${key}=${value}`
        )
    }
})

test("formats balances without floating-point rounding or losing a negative fractional sign", () => {
    assert.match(
        formatWalletMoney("9999999999999999.99", "EUR"),
        /9,999,999,999,999,999\.99/
    )
    assert.match(formatWalletMoney("-0.01", "GBP"), /-GBP\s0\.01/)
    assert.match(formatWalletMoney("0.00", "USD"), /USD\s0\.00/)
})
