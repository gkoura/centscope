# Workspace caching

Financial data uses TanStack Query in browser memory and IndexedDB on the current device. PostgreSQL remains authoritative. No session or financial result is stored in a shared Next.js `use cache` scope, Redis, a CDN, or an HTTP response cache.

## Reads and rendering

Server pages and layouts retain their public headings, navigation structure, Suspense boundaries, and prerendered HTML. Small browser data sections resolve the signed-in identity before restoring or displaying private data. Cold loads need JavaScript, a verified session, and the first API response; warm navigation and reloads can reuse saved results while refreshing them.

`GET /api/workspace` delegates to the existing server services. It validates the session, email verification, expected user, cache revision, and account ownership. Responses use `Cache-Control: private, no-store`. Reads use GET requests with cancellation, rather than serializing independent reads through Server Actions. React `cache` deduplicates authentication and shared account/wallet reads during Server Component rendering. Route Handlers use a separate `AsyncLocalStorage` request context for the already verified session and pass the authorized account directly to their loaders, avoiding repeated authentication and account queries without sharing identities across requests.

The cached resources are:

- Account lists and account navigation.
- Per-account reference data: account details, wallets and posted balances, categories and subcategories.
- Transactions and activity summaries for each selected period/filter/cursor.
- Monthly overview activity, smoothed balance history, and detailed monthly analysis.
- New transaction suggestions and transfer wallet options.

Data is cached on demand, not by downloading every transaction on login. Editable transaction versions, deletion previews, import confirmation data, form request IDs, and authentication queries keep their existing fresh server flow and are not persisted.

## Freshness and mutations

Opening a cached section and returning focus to the app refresh its active queries in the background. Identical reads share a query; URL parameter order and equivalent wallet filters share keys. Different users, accounts, periods, filters, cursors, and resources have separate keys. UTC day changes update default periods and dates.

Every existing financial mutation revalidates through `revalidateWorkspacePath`. After a successful write it changes a nonsecret revision cookie and retains the existing Next.js path revalidation. The streamed root revision signal notifies the browser and other tabs. Queries from the prior revision cannot populate the new namespace; a request racing a cookie change receives 409 and refreshes its scope. The invalidation is deliberately user-wide so shared wallets and transfers cannot leave another account stale.

The same screen can retain its previous value while its revision refreshes, preserving open dialogs and draft inputs. Placeholder values never cross users, accounts, resources, or filter/period changes, and are never written as successful responses into the new cache namespace. New responses update the screen. The server still validates permissions, amounts, versions, idempotency, and transaction invariants on every write.

## Persistence and failure handling

Only financial query values are dehydrated. IndexedDB stores one versioned snapshot per user, capped at 60 recent queries and 20 MiB, with a 24-hour snapshot lifetime. Oversized datasets are skipped. Inactive memory entries outside the retained budget are removed; active views remain usable. Authentication data and mutations are excluded. Restoration does not overwrite newer memory data.

Logout immediately cancels/removes financial queries and erases persisted snapshots, including in other open tabs. User switches remove the prior user's values; an unverified or rejected identity cannot display saved data. A confirmed signed-out visit also clears dormant snapshots.

Browser storage denial, quota failures, corruption, or eviction fall back to memory and server reads. A failed background refresh retains the last successful data and displays a saved-data notice with Retry. The app does not queue offline financial writes. A new browser session must identify the user before showing saved financial data.

## Verification

`tests/unit/workspace-cache.test.mjs` covers equivalent/different query keys, user/revision isolation, expiry, newer-response precedence, persistence budgets, and failed-refresh preservation. Run with `pnpm test:unit`.

For browser verification, use disposable verified users and test records. Check warm navigation and a hard reload while workspace API reads are blocked, then reconnect. Create/edit a transaction and verify both the history and balance refresh; verify draft inputs survive a revision refresh. Check month/account isolation, cross-user API rejection, and logout clearing IndexedDB. Do not use real financial records as fixtures.

### Verification performed on 2026-11-05

The 76-test unit suite, scoped ESLint, TypeScript and production build passed. Actual generated HTML for overview, transaction and account-list routes retained public structure and loading UI without fixture data. Next.js runtime checks were clean after moving submission UUID creation behind an explicit request boundary.

With two disposable verified users and 3,000 seeded transactions, authenticated checks verified account/period isolation, a 250-entry month view, cursor pagination, no-store headers, anonymous/foreign-user rejection, and revision-race rejection. Blocking workspace reads preserved the cached transaction screen on navigation and reload; its saved-data notice appeared. The sampled snapshot was about 93 KB. A real new expense refreshed history from 250 to 251 entries and balance from -30,000.00 to -30,012.34. Draft text and the input DOM element survived background and revision refresh. Both open tabs redirected on logout and IndexedDB was empty. A second user saw only their own account and their logout also erased storage.

Category/wallet editing, transfer submission, imports and recurring schedule editing were not replayed end to end in this caching session. Their existing mutation paths now use the same invalidation helper; their financial service behavior was preserved. The temporary users, sessions, financial records and browser state were removed after verification.

The final API optimization was checked with simultaneous requests from both disposable users, and request-context unit tests verify that parallel and failed requests cannot retain or exchange identities. The minimal final fixtures were also removed.
