<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Page structure and partial prerendering

- Preserve Cache Components and Partial Prefetching in `next.config.ts`. Prefer
  pages with useful prerendered HTML and request-specific content streamed through
  Suspense, rather than making the whole route wait for authentication or data.
- Keep `page.tsx` and layouts as Server Components by default. Render static
  headings, instructions, navigation, and page structure outside dynamic boundaries.
- Colocate route-specific async Server Components in the route's `_components/`
  directory. Await `params`, `searchParams`, sessions, and database reads inside
  these components, beneath an explicit `<Suspense>` boundary. `_components` is
  organizational; it does not establish a server/client boundary.
- Use small Client Components for state, event handlers, and browser APIs. Keep
  reusable interactive forms in shared component directories; do not turn whole
  pages or layouts into Client Components to support a small interactive control.
- Give independently loading sections separate Suspense boundaries and meaningful,
  appropriately sized fallbacks. Keep `loading.tsx` for route-level navigation
  fallbacks; it does not replace granular boundaries within a page.
- Authenticate and authorize every private data read and mutation on the server.
  Static shells must contain only public UI. Do not put sessions or private
  financial data in shared `"use cache"` scopes; use React `cache` for request-level
  deduplication where appropriate.
- Read the installed Next.js guides before changing rendering behavior. Verify
  the production build, inspect the actual static shell (not just the `◐` glyph),
  and check loading, redirects, and resolved content in the running app. Document
  any authenticated flows that could not be exercised.

## Database documentation

Whenever changing the database model, update `prisma/ERD.md` in the same change
by running `pnpm db:erd`. Run `pnpm db:erd:check` to verify it matches the schema.
New or renamed models must be assigned to a readable section in
`scripts/generate-erd.mjs`. Keep `prisma/SCHEMA_NOTES.md` current with constraints
and database behavior that Prisma cannot represent, and update
`PROJECT_CONTEXT.md` with decisions and progress.
