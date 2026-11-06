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

Data is cached on demand and through a bounded background transaction window, rather than downloading every transaction on login. Editable transaction versions, deletion previews, import confirmation data, form request IDs, and authentication queries keep their existing fresh server flow and are not persisted.

## Freshness and mutations

Opening a cached section refreshes stale queries in the background; fresh queries are reused immediately (30 seconds for financial data, five minutes for account lists). Returning focus to the app refreshes its active queries, including fresh ones. Identical reads share a query; URL parameter order and equivalent wallet filters share keys. Different users, accounts, periods, filters, cursors, and resources have separate keys. UTC day changes update default periods and dates.

Every existing financial mutation revalidates through `revalidateWorkspacePath`. After a successful write it changes a nonsecret revision cookie and retains the existing Next.js path revalidation. The streamed root revision signal notifies the browser and other tabs. Queries from the prior revision cannot populate the new namespace; a request racing a cookie change receives 409 and refreshes its scope. The invalidation is deliberately user-wide so shared wallets and transfers cannot leave another account stale.

The same screen can retain its previous value while its revision refreshes, preserving open dialogs and draft inputs. Placeholder values never cross users, accounts, resources, or filter/period changes, and are never written as successful responses into the new cache namespace. New responses update the screen. The server still validates permissions, amounts, versions, idempotency, and transaction invariants on every write.

## Background transaction prefetching

Once the active account Overview or monthly Transactions screen has its reference and visible data, an idle queue warms the selected month, two previous months, and the next month. The window follows the selected month; prefetched results do not recursively expand it. Speculation uses the default unfiltered month, so arbitrary searches, wallet/status filters and pagination remain on demand. Year/custom views and editing screens do not start a queue.

Foreground and background reads share the exact query options and user/revision/account keys. Fresh prefetched data can therefore render on navigation without another workspace read. An in-flight request survives navigation between the same account's Overview and Transactions, including the interval before the destination mounts. Stale data still refreshes and writes invalidate the existing revision namespace.

Only one speculative request runs at a time, at low fetch priority, with an idle delay between requests. The queue yields to foreground queries and mutations, pauses while hidden/offline or on Data Saver/2G connections, and resumes on return. Leaving the account or logging out stops queued work and cancels inactive speculative reads. Access/revision failures stop the queue; ordinary speculative failures do not interrupt the visible screen. Prefetched snapshots use the existing persistence budgets and logout cleanup.

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

### Prefetch verification performed on 2026-11-06

All 89 unit tests, scoped ESLint, TypeScript and the isolated production build passed. The generated Overview and Transactions HTML retained public structure and Suspense boundaries without fixture data. Next.js compilation/runtime diagnostics were clean, and React inspection confirmed the prefetch component was mounted beneath account navigation.

Using one disposable verified user, two accounts and four monthly transactions, browser checks confirmed Overview persisted September through December snapshots. Opening Transactions and moving between October, November and December issued no additional reads for those fresh months; browsing October started an August read at low priority. Unit regression checks also cover navigation before the destination observer mounts, cancellation, access/revision failures and user/revision key isolation. Financial mutation workflows were not replayed for this prefetch change. The disposable fixtures and saved browser financial data were removed after verification.
