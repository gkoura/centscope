import test from "node:test"
import assert from "node:assert/strict"
import {
    walletFilterIds,
    toggleWalletFilter,
    parseTransactionFilters,
} from "../../src/lib/transaction-filters.ts"
test("wallet selection supports single, combined and repeated URL keys with limits", () => {
    assert.deepEqual(walletFilterIds("bank,cash,bank"), ["bank", "cash"])
    assert.deepEqual(walletFilterIds(["bank", "cash,travel"]), [
        "bank",
        "cash",
        "travel",
    ])
    assert.equal(
        parseTransactionFilters({ wallet: ["bank", "cash"] }).wallet,
        "bank,cash"
    )
    assert.equal(parseTransactionFilters({ wallet: "bank" }).wallet, "bank")
    assert.deepEqual(walletFilterIds(["", "bad/id", "x".repeat(129)]), [])
    assert.equal(
        walletFilterIds(Array.from({ length: 150 }, (_, i) => "wallet" + i))
            .length,
        100
    )
})
test("each wallet toggles independently and removing the last restores all wallets", () => {
    let selected = toggleWalletFilter(undefined, "bank")
    assert.equal(selected, "bank")
    selected = toggleWalletFilter(selected, "cash")
    assert.equal(selected, "bank,cash")
    selected = toggleWalletFilter(selected, "bank")
    assert.equal(selected, "cash")
    selected = toggleWalletFilter(selected, "cash")
    assert.equal(selected, "")
    assert.equal(
        parseTransactionFilters({ wallet: selected }).wallet,
        undefined
    )
})
