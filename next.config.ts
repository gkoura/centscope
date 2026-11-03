import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    // Keep production verification output separate from a running dev server.
    distDir: process.env.FINTRACK_BUILD_DIR || ".next",
    experimental: { serverActions: { bodySizeLimit: "4mb" } },
    cacheComponents: true,
    partialPrefetching: true,
}

export default nextConfig
