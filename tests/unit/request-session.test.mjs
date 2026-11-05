import test from "node:test"
import assert from "node:assert/strict"
import {
    withRequestSession,
    currentRequestSession,
} from "../../src/lib/request-session.ts"

test("parallel requests reuse only their own verified session and leave no shared identity afterward", async () => {
    const alice = { user: { id: "alice" } },
        bob = { user: { id: "bob" } }
    let release
    const barrier = new Promise((resolve) => {
        release = resolve
    })
    const first = withRequestSession(alice, async () => {
        assert.equal(currentRequestSession(), alice)
        await barrier
        assert.equal(currentRequestSession(), alice)
        await Promise.resolve()
        assert.equal(currentRequestSession(), alice)
    })
    const second = withRequestSession(bob, async () => {
        assert.equal(currentRequestSession(), bob)
        release()
        await Promise.resolve()
        assert.equal(currentRequestSession(), bob)
    })
    assert.equal(currentRequestSession(), undefined)
    await Promise.all([first, second])
    assert.equal(currentRequestSession(), undefined)
})

test("a failed request cannot leave its session in the next request", async () => {
    await assert.rejects(
        withRequestSession({ user: { id: "failed" } }, async () => {
            throw new Error("read failed")
        })
    )
    assert.equal(currentRequestSession(), undefined)
    await withRequestSession({ user: { id: "next" } }, async () =>
        assert.equal(currentRequestSession().user.id, "next")
    )
    assert.equal(currentRequestSession(), undefined)
})
