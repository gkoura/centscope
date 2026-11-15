import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    // Keep production verification output separate from a running dev server.
    distDir: process.env.FINTRACK_BUILD_DIR || ".next",
    experimental: { serverActions: { bodySizeLimit: "4mb" } },
    cacheComponents: true,
    partialPrefetching: true,
    async headers() {
        return [
            {
                source: "/sw.js",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "no-cache, no-store, must-revalidate",
                    },
                    {
                        key: "Content-Type",
                        value: "application/javascript; charset=utf-8",
                    },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                ],
            },
        ]
    },
}

export default nextConfig
