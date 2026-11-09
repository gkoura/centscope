// Exact rational arithmetic keeps financial calculations independent of binary
// floating-point rounding. Only the final result is rounded, half up, to cents.
type Fraction = { n: bigint; d: bigint }

export function calculateAmount(expression: string): string {
    if (!expression.trim()) throw new Error("Enter a calculation.")
    if (expression.length > 200)
        throw new Error("Keep calculations under 200 characters.")
    const source = expression
        .replaceAll(",", ".")
        .replaceAll("×", "*")
        .replaceAll("÷", "/")
        .replaceAll("−", "-")
    let index = 0
    const skip = () => {
        while (/\s/.test(source[index] ?? "") && index < source.length) index++
    }
    function primary(): Fraction {
        skip()
        if (source[index] === "+" || source[index] === "-") {
            const negative = source[index++] === "-"
            const value = primary()
            return { n: negative ? -value.n : value.n, d: value.d }
        }
        if (source[index] === "(") {
            index++
            const value = sum()
            skip()
            if (source[index++] !== ")")
                throw new Error("Close the parentheses.")
            return value
        }
        const match = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(source.slice(index))
        if (!match) throw new Error("Enter a complete calculation.")
        index += match[0].length
        const [whole, decimal = ""] = match[0].split(".")
        return {
            n: BigInt((whole || "0") + decimal),
            d: BigInt("10") ** BigInt(decimal.length),
        }
    }
    function product(): Fraction {
        let left = primary()
        skip()
        while (source[index] === "*" || source[index] === "/") {
            const operator = source[index++]
            const right = primary()
            if (operator === "/" && right.n === BigInt("0"))
                throw new Error("Cannot divide by zero.")
            left =
                operator === "*"
                    ? { n: left.n * right.n, d: left.d * right.d }
                    : { n: left.n * right.d, d: left.d * right.n }
            skip()
        }
        return left
    }
    function sum(): Fraction {
        let left = product()
        skip()
        while (source[index] === "+" || source[index] === "-") {
            const operator = source[index++]
            const right = product()
            left = {
                n:
                    left.n * right.d +
                    (operator === "+" ? BigInt("1") : -BigInt("1")) *
                        right.n *
                        left.d,
                d: left.d * right.d,
            }
            skip()
        }
        return left
    }
    const result = sum()
    skip()
    if (index !== source.length)
        throw new Error(
            "Use numbers, +, −, ×, ÷ and parentheses. Use decimals without thousands separators."
        )
    if (result.d < BigInt("0")) {
        result.n = -result.n
        result.d = -result.d
    }
    if (result.n < BigInt("0"))
        throw new Error("The amount cannot be negative.")
    const cents =
        (result.n * BigInt("200") + result.d) / (BigInt("2") * result.d)
    if (cents > BigInt("999999999999999999"))
        throw new Error("The amount is too large.")
    return `${cents / BigInt("100")}.${String(cents % BigInt("100")).padStart(2, "0")}`
}
