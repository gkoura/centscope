import { loadEnvConfig } from "@next/env";
import { defineConfig, env } from "prisma/config";

// Load Next.js environment variables (.env.local, .env, etc.)
loadEnvConfig(process.cwd());

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: env("DATABASE_URL_UNPOOLED"),
    },
});