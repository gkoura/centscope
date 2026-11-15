import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/",
        name: "CentScope",
        short_name: "CentScope",
        description: "Make sense of every cent.",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        background_color: "#fafbf8",
        theme_color: "#fafbf8",
        lang: "en",
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            {
                src: "/icons/icon-maskable-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    }
}
