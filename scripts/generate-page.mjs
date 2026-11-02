import fs from "node:fs"
import path from "node:path"

const args = process.argv.slice(2)
const route = args.find((arg) => !arg.startsWith("--"))
const flags = new Set(args.filter((arg) => arg.startsWith("--")))

if (!route) {
    console.error(
        "Usage: pnpm run generate:page <route> [--layout] [--not-found]"
    )
    process.exit(1)
}

const segments = route.split("/")

if (
    segments.some(
        (segment) =>
            !segment ||
            !/^[a-zA-Z0-9_-]+$/.test(segment) ||
            segment === "." ||
            segment === ".."
    )
) {
    console.error("Invalid route. Example: dashboard/settings")
    process.exit(1)
}

const appRoot = fs.existsSync("src/app") ? "src/app" : "app"
const target = path.join(appRoot, ...segments)
const pageName = segments.at(-1)
const componentName = pageName
    .split(/[-_]/)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("")

if (fs.existsSync(target)) {
    console.error(`Route already exists: ${target}`)
    process.exit(1)
}

const files = {
    "page.tsx": `export default function ${componentName}Page() {
    return (
        <main>
            <h1>${componentName}</h1>
        </main>
    );
}
`,
    "loading.tsx": `export default function Loading() {
    return (
        <div role="status" className="animate-pulse space-y-4">
            <div className="bg-muted h-8 w-48 rounded-md" />
            <div className="bg-muted h-32 rounded-md" />
            <span className="sr-only">Loading...</span>
        </div>
    );
}
`,
    "error.tsx": `"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div role="alert" className="space-y-4">
            <h2>Something went wrong.</h2>
            <button type="button" onClick={() => reset()}>
                Try again
            </button>
        </div>
    );
}
`,
}

if (flags.has("--layout")) {
    files["layout.tsx"] = `import type { ReactNode } from "react";

export default function ${componentName}Layout({
    children,
}: {
    children: ReactNode;
}) {
    return <>{children}</>;
}
`
}

if (flags.has("--not-found")) {
    files["not-found.tsx"] = `import Link from "next/link";

export default function NotFound() {
    return (
        <main>
            <h1>Page not found</h1>
            <Link href="/">Return home</Link>
        </main>
    );
}
`
}

fs.mkdirSync(target, { recursive: true })
fs.mkdirSync(path.join(target, "_components"))

for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(target, filename), content, {
        flag: "wx",
    })
}

console.log(`Created route: /${route}`)
console.log(`Location: ${target}`)
console.log(`Files: ${Object.keys(files).join(", ")}`)
