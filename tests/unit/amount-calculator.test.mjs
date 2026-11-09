import test from "node:test"
import assert from "node:assert/strict"
import { calculateAmount } from "../../src/lib/amount-calculator.ts"

test("calculates with precedence, parentheses, unary signs and decimal commas", () => {
    for (const [expression, expected] of [
        ["12.50 + 8 / 2", "16.50"],
        ["(12,50 + 8) ÷ 2", "10.25"],
        ["20 − 3 × 4", "8.00"],
        [".5 + +2", "2.50"],
        ["10 / -2 + 8", "3.00"],
        ["-(-3)", "3.00"],
        ["0", "0.00"],
    ])
        assert.equal(calculateAmount(expression), expected, expression)
})

test("rounds only the final result half up and preserves large amounts exactly", () => {
    assert.equal(calculateAmount("0.1 + 0.2"), "0.30")
    assert.equal(calculateAmount("1 / 3 * 3"), "1.00")
    assert.equal(calculateAmount("1.005"), "1.01")
    assert.equal(calculateAmount("2 / 3"), "0.67")
    assert.equal(
        calculateAmount("9999999999999999.98 + .01"),
        "9999999999999999.99"
    )
})

test("rejects invalid, negative, out-of-range and executable input", () => {
    for (const expression of [
        "",
        "1 +",
        "1 / 0",
        "2/(3-3)",
        "(2+3",
        "2+3)",
        "1..2",
        "1,234.56",
        "2(3)",
        "-1",
        "10000000000000000",
        "alert(1)",
        "1; process.exit()",
        "1".repeat(201),
    ])
        assert.throws(() => calculateAmount(expression), undefined, expression)
})
