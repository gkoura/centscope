import test from "node:test"
import assert from "node:assert/strict"
import { usesAccountHeader } from "../../src/lib/workspace-header.ts"

test("Accounts, account creation and Settings use the header without an account selector", () => {
    for (const path of [
        "/dashboard",
        "/dashboard/accounts",
        "/dashboard/accounts/",
        "/dashboard/accounts/new",
        "/settings/security",
    ]) {
        assert.equal(usesAccountHeader(path), false, path)
    }
})
test("only account-specific routes use the account selector header", () => {
    for (const path of [
        "/dashboard/accounts/personal",
        "/dashboard/accounts/personal/transactions",
        "/dashboard/accounts/personal/analytics",
        "/dashboard/accounts/personal/wallets/new",
        "/dashboard/accounts/new-account-id",
    ]) {
        assert.equal(usesAccountHeader(path), true, path)
    }
    assert.equal(
        usesAccountHeader("/dashboard/accounts-archive/personal"),
        false
    )
})
