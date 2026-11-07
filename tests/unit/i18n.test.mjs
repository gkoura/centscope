import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"
import { localization } from "@better-auth-ui/core"
import {
    preferredLocale,
    localizeHref,
    stripLocale,
} from "../../src/lib/i18n/config.ts"
import { translate, translateObject } from "../../src/lib/i18n/translate.ts"
import { formatPeriod } from "../../src/lib/i18n/format.ts"
import { formatWalletMoney } from "../../src/lib/wallet-input.ts"
import { parseMoneyPaste } from "../../src/lib/money-input.ts"
import {
    previewTransactionImport,
    importColumns,
} from "../../src/lib/transaction-import.ts"
import { createTranslator } from "../../src/lib/i18n/translate.ts"

test("language negotiation honors a supported preference and browser quality values", () => {
    assert.equal(preferredLocale("el", "en-US"), "el")
    assert.equal(
        preferredLocale("invalid", "fr;q=1,el-GR;q=0.9,en;q=0.5"),
        "el"
    )
    assert.equal(preferredLocale(undefined, "el;q=0,en;q=0.2"), "en")
    assert.equal(preferredLocale(undefined, "EL-gr,en;q=0.5"), "el")
    assert.equal(preferredLocale(undefined, "fr,de;q=0.5"), "en")
    assert.equal(preferredLocale(undefined, null), "en")
})

test("localized URLs preserve deep links, filters and fragments without changing API or external URLs", () => {
    assert.equal(
        localizeHref(
            "/en/dashboard/accounts/abc/transactions?month=2026-11#wallet",
            "el"
        ),
        "/el/dashboard/accounts/abc/transactions?month=2026-11#wallet"
    )
    assert.equal(localizeHref("/#features", "el"), "/el/#features")
    assert.equal(localizeHref("/", "en"), "/en")
    assert.equal(
        localizeHref("/api/auth/callback/google", "el"),
        "/api/auth/callback/google"
    )
    assert.equal(
        localizeHref("https://example.com", "el"),
        "https://example.com"
    )
    assert.equal(localizeHref("//example.com/path", "el"), "//example.com/path")
    assert.equal(stripLocale("/el/settings/security"), "/settings/security")
    assert.equal(stripLocale("/elements"), "/elements")
})

test("translations preserve interpolation, unknown content and the source locale", () => {
    assert.equal(
        translate("el", "Change language to {language}", {
            language: "English",
        }),
        "Αλλαγή γλώσσας σε English"
    )
    assert.equal(translate("en", "Account"), "Account")
    assert.equal(translate("el", "constructor"), "constructor")
    assert.equal(translate("el", "My own wallet name"), "My own wallet name")
    assert.deepEqual(
        translateObject({ label: "Account", children: ["Wallet"] }, "el"),
        { label: "Λογαριασμός", children: ["Πορτοφόλι"] }
    )
})

test("Greek money keeps exact large values and Greek pasted amounts use canonical decimals", () => {
    assert.equal(
        formatWalletMoney("9007199254740993.01", "EUR", "el-GR"),
        "9.007.199.254.740.993,01 €"
    )
    assert.equal(formatWalletMoney("-0.01", "EUR", "el-GR"), "-0,01 €")
    assert.equal(formatWalletMoney("1234.56", "GBP", "en-GB"), "1,234.56 £")
    assert.equal(parseMoneyPaste("1.234,56", "el-GR"), "1234.56")
})

test("period labels use Greek months without shifting stored calendar dates", () => {
    const period = {
        view: "month",
        month: "2026-11",
        year: "2026",
        from: "2026-11-01",
        to: "2026-11-30",
        label: "November 2026",
    }
    assert.equal(formatPeriod(period, "el"), "Νοέμβριος 2026")
    assert.equal(formatPeriod({ ...period, view: "year" }, "el"), "2026")
    assert.equal(
        formatPeriod({ ...period, view: "custom" }, "el"),
        "1 Νοε 2026 – 30 Νοε 2026"
    )
})

test("CSV row validation translates dynamic errors without changing wallet names or file codes", () => {
    const result = previewTransactionImport(
        `${importColumns.join(",")}\n2026-02-30,Καφές,EXPENSE,12.34,Cash,Food,,POSTED,`,
        "account",
        [{ id: "wallet", name: "Cash", currency: "EUR" }],
        [{ id: "category", name: "Food", type: "EXPENSE", parentId: null }],
        createTranslator("el")
    )
    assert.equal(result.rows.length, 0)
    assert.match(result.errors[0], /^Γραμμή 2: Επίλεξε έγκυρη ημερομηνία\./)
})

test("Greek dictionary covers every explicit UI message, auth message, and interpolation token", () => {
    const dictionary = JSON.parse(
        readFileSync(
            new URL("../../src/lib/i18n/el.json", import.meta.url),
            "utf8"
        )
    )
    const missing = new Set()
    function check(message) {
        if (!message || message === "CentScope" || /@/.test(message)) return
        if (!Object.hasOwn(dictionary, message)) missing.add(message)
    }
    function authMessages(value) {
        for (const message of Object.values(value)) {
            if (typeof message === "string") check(message)
            else authMessages(message)
        }
    }
    authMessages(localization)
    function scan(directory) {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const path = join(directory, entry.name)
            if (entry.isDirectory()) {
                if (!entry.name.startsWith("_archived")) scan(path)
                continue
            }
            if (!/\.tsx?$/.test(path)) continue
            const source = ts.createSourceFile(
                path,
                readFileSync(path, "utf8"),
                ts.ScriptTarget.Latest,
                true
            )
            function visit(node) {
                if (
                    ts.isCallExpression(node) &&
                    node.expression.getText(source) === "t" &&
                    node.arguments[0] &&
                    ts.isStringLiteral(node.arguments[0])
                )
                    check(node.arguments[0].text)
                ts.forEachChild(node, visit)
            }
            visit(source)
        }
    }
    scan(new URL("../../src", import.meta.url).pathname)
    assert.deepEqual([...missing].sort(), [])
    const tokens = (message) =>
        [...message.matchAll(/\{\{?\w+\}?\}/g)].map(([token]) => token).sort()
    for (const [source, translated] of Object.entries(dictionary)) {
        assert.ok(translated.trim(), `Empty translation: ${source}`)
        assert.deepEqual(
            tokens(translated),
            tokens(source),
            `Interpolation differs: ${source}`
        )
    }
})
