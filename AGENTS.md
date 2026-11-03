<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Database documentation

Whenever changing the database model, update `prisma/ERD.md` in the same change
by running `pnpm db:erd`. Run `pnpm db:erd:check` to verify it matches the schema.
New or renamed models must be assigned to a readable section in
`scripts/generate-erd.mjs`. Keep `prisma/SCHEMA_NOTES.md` current with constraints
and database behavior that Prisma cannot represent, and update
`PROJECT_CONTEXT.md` with decisions and progress.
