import test from "node:test"
import assert from "node:assert/strict"
import {
    parseOpeningBalance,
    validateWalletInput,
    validateWalletDetails,
    formatWalletMoney,
} from "../../src/lib/wallet-input.ts"

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
        ["13,59", "13.59"],
        ["-125,5", "-125.50"],
        ["-0,00", "0.00"],
        [" 0,01 ", "0.01"],
        ["9999999999999999,99", "9999999999999999.99"],
        ["9999999999999999.99", "9999999999999999.99"],
    ]) {
        assert.equal(parseOpeningBalance(raw), expected)
    }
})

test("rejects excessive precision, overflow, exponent notation, grouping and non-finite money", () => {
    for (const raw of [
        "0.001",
        "13,591",
        "1,000",
        "1.234,56",
        "13,,59",
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
    assert.equal(formatWalletMoney("-0.01", "GBP"), "-0.01 £")
    assert.equal(formatWalletMoney("0.00", "USD"), "0.00 $")
    assert.equal(formatWalletMoney("13.59", "EUR"), "13.59 €")
    assert.equal(formatWalletMoney("1356.78", "USD"), "1,356.78 $")
    assert.equal(
        formatWalletMoney("9999999999999999.99", "EUR"),
        "9,999,999,999,999,999.99 €"
    )
})

function editInput(overrides = {}) {
    return input({
        accountWalletId: "allocation",
        expectedUpdatedAt: "2026-11-03T12:00:00.000Z",
        expectedOpeningId: "opening",
        expectedOpeningVersion: "3",
        ...overrides,
    })
}
test("opening edits preserve exact positive, negative and zero amounts with explicit date-independent statuses", () => {
    for (const amount of ["-0.25", "0", "125.5", "9999999999999999.99"]) {
        const parsed = validateWalletDetails(
            editInput({
                openingBalance: amount,
                openingDate: "2099-12-31",
                openingStatus: "POSTED",
            })
        )
        assert.equal(parsed?.openingBalance, parseOpeningBalance(amount))
        assert.equal(parsed?.openingStatus, "POSTED")
        assert.equal(parsed?.expectedOpeningVersion, 3)
    }
    const missing = validateWalletDetails(
        editInput({
            expectedOpeningId: "",
            expectedOpeningVersion: "",
            openingBalance: "25",
            openingStatus: "PENDING",
        })
    )
    assert.equal(missing?.expectedOpeningId, null)
    assert.equal(missing?.expectedOpeningVersion, null)
    assert.equal(missing?.openingBalance, "25.00")
})
test("opening edits reject invalid amounts, impossible dates and incomplete or malformed optimistic references", () => {
    for (const overrides of [
        { openingBalance: "" },
        { openingBalance: "1.001" },
        { openingBalance: "NaN" },
        { openingDate: "2026-02-30" },
        { openingStatus: "SCHEDULED" },
        { expectedOpeningId: "", expectedOpeningVersion: "1" },
        { expectedOpeningVersion: "" },
        { expectedOpeningVersion: "0" },
        { expectedOpeningVersion: "2147483647" },
        { expectedUpdatedAt: "yesterday" },
    ]) {
        assert.equal(validateWalletDetails(editInput(overrides)), null)
    }
})
