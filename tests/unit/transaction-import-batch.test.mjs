import test from "node:test"
import assert from "node:assert/strict"
import {
    createImportPlan,
    verifyImportBatch,
} from "../../src/lib/transaction-import-plan.ts"
import {
    processImportPlan,
    importProgress,
} from "../../src/lib/transaction-import-runner.ts"
const secret = "test-only-import-signature-key"
const row = {
    financialAccountId: "account",
    accountWalletId: "wallet",
    categoryId: "category",
    requestId: "00000000-0000-4000-8000-000000000000",
    type: "EXPENSE",
    name: "Lunch",
    amount: "1.00",
    date: "2026-11-03",
    status: "POSTED",
    notes: null,
}
function plan(count = 2000, now = 1000) {
    return createImportPlan(
        "identical file",
        "account",
        "owner",
        Array.from({ length: count }, () => ({ ...row })),
        secret,
        now
    )
}
test("2,000 rows produce forty bounded batches with stable row identities and source offsets", () => {
    const a = plan(),
        b = plan(2000, 2000)
    assert.equal(a.total, 2000)
    assert.equal(a.batches.length, 40)
    const ids = []
    for (let i = 0; i < a.batches.length; i++) {
        const batch = verifyImportBatch(a.batches[i], "owner", secret, 3000)
        assert.equal(batch.start, i * 50)
        assert.equal(batch.rows.length, 50)
        assert.deepEqual(
            batch.rows,
            verifyImportBatch(b.batches[i], "owner", secret, 3000).rows
        )
        ids.push(...batch.rows.map((row) => row.requestId))
    }
    assert.equal(new Set(ids).size, 2000)
    assert.equal(
        verifyImportBatch(plan(51).batches[1], "owner", secret, 3000).rows
            .length,
        1
    )
})
test("signed plans reject tampering, cross-user replay, wrong secrets and expiry", () => {
    const token = plan(1).batches[0]
    for (const [value, user, key, now] of [
        [token + "a", "owner", secret, 2000],
        [token, "stranger", secret, 2000],
        [token, "owner", "wrong", 2000],
        [token, "owner", secret, 1000 + 24 * 60 * 60 * 1000],
        [null, "owner", secret, 2000],
    ])
        assert.throws(
            () => verifyImportBatch(value, user, key, now),
            /invalid or expired/
        )
    const [payload, sig] = token.split(".")
    const data = JSON.parse(Buffer.from(payload, "base64url"))
    data.rows[0].amount = "999.00"
    assert.throws(() =>
        verifyImportBatch(
            `${Buffer.from(JSON.stringify(data)).toString("base64url")}.${sig}`,
            "owner",
            secret,
            2000
        )
    )
})
test("runner pauses after a confirmed batch, resumes and reports only confirmed counts", async () => {
    const checkpoint = {
        plan: plan(120),
        nextBatch: 0,
        imported: 0,
        skipped: 0,
    }
    let pause = false,
        calls = 0
    const process = async (token) => {
        calls++
        return {
            imported: verifyImportBatch(token, "owner", secret, 2000).rows
                .length,
            skipped: 0,
        }
    }
    assert.equal(
        await processImportPlan(
            checkpoint,
            process,
            () => {
                pause = true
            },
            () => pause
        ),
        false
    )
    assert.equal(checkpoint.nextBatch, 1)
    assert.equal(importProgress(checkpoint).completed, 50)
    pause = false
    assert.equal(
        await processImportPlan(
            checkpoint,
            process,
            () => {},
            () => pause
        ),
        true
    )
    assert.equal(calls, 3)
    assert.equal(importProgress(checkpoint).completed, 120)
})
test("lost responses retry the uncertain batch without advancing checkpoint or duplicating saved rows", async () => {
    const checkpoint = {
            plan: plan(100),
            nextBatch: 0,
            imported: 0,
            skipped: 0,
        },
        saved = new Set()
    let fail = true
    async function process(token) {
        const batch = verifyImportBatch(token, "owner", secret, 2000)
        let imported = 0,
            skipped = 0
        for (const row of batch.rows) {
            if (saved.has(row.requestId)) skipped++
            else {
                saved.add(row.requestId)
                imported++
            }
        }
        if (batch.start === 50 && fail) {
            fail = false
            throw new Error("Response lost after commit")
        }
        return { imported, skipped }
    }
    await assert.rejects(
        processImportPlan(
            checkpoint,
            process,
            () => {},
            () => false
        ),
        /Response lost/
    )
    assert.equal(checkpoint.nextBatch, 1)
    assert.equal(importProgress(checkpoint).completed, 50)
    assert.equal(
        await processImportPlan(
            checkpoint,
            process,
            () => {},
            () => false
        ),
        true
    )
    assert.equal(saved.size, 100)
    assert.deepEqual(importProgress(checkpoint), {
        completed: 100,
        total: 100,
        imported: 50,
        skipped: 50,
    })
})
test("batch failure preserves earlier progress and prevents dispatch of following batches", async () => {
    const checkpoint = {
        plan: plan(150),
        nextBatch: 0,
        imported: 0,
        skipped: 0,
    }
    let calls = 0
    await assert.rejects(
        processImportPlan(
            checkpoint,
            async () =>
                ++calls === 1
                    ? { imported: 50, skipped: 0 }
                    : { message: "Row 52: unavailable category" },
            () => {},
            () => false
        ),
        /Row 52/
    )
    assert.equal(calls, 2)
    assert.equal(checkpoint.nextBatch, 1)
})
