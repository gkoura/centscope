# Workspace caching

Financial data uses TanStack Query in browser memory and IndexedDB on the current device. PostgreSQL remains authoritative. No session or financial result is stored in a shared Next.js `use cache` scope, Redis, a CDN, or an HTTP response cache.

## Reads and rendering

Server pages and layouts retain their public headings, navigation structure, Suspense boundaries, and prerendered HTML. Small browser data sections resolve the signed-in identity before restoring or displaying private data. Cold loads need JavaScript, a verified session, and the first API response; warm navigation and reloads can reuse saved results while refreshing them.

`GET /api/workspace` delegates to the existing server services. It validates the session, email verification, expected user, cache revision, and current owner/member account access. Responses use `Cache-Control: private, no-store`. Reads use GET requests with cancellation, rather than serializing independent reads through Server Actions. React `cache` deduplicates authentication and shared account/wallet reads during Server Component rendering. Route Handlers use a separate `AsyncLocalStorage` request context for the already verified session and pass the authorized account directly to their loaders, avoiding repeated authentication and account queries without sharing identities across requests.

The cached resources are:

- Account lists and account navigation.
- Per-account reference data: account details, wallets and posted balances, categories and subcategories.
- Transactions and activity summaries for each selected period/filter/cursor.
- Smoothed balance history on Overview, period summaries on Analytics, default/historic monthly trends, and the recurring summary.
- Detailed monthly analysis retained for the archived implementation; its resource remains available but is not prefetched.
- New transaction suggestions and transfer wallet options.
- Budget inventory, cadence/period/mode summaries and paginated contribution popups.

Data is cached on demand and through a bounded background transaction window, rather than downloading every transaction on login. Editable transaction versions, deletion previews, import confirmation data, form request IDs, and authentication queries keep their existing fresh server flow and are not persisted.

## Freshness and mutations

Opening a cached section refreshes stale queries in the background; fresh queries are reused immediately (30 seconds for financial data, five minutes for account lists). Returning focus to the app refreshes its active queries, including fresh ones. Identical reads share a query; URL parameter order and equivalent wallet filters share keys. Different users, accounts, periods, filters, cursors, and resources have separate keys. UTC day changes update default periods and dates.

Every existing financial mutation revalidates through `revalidateWorkspacePath`. After a successful write it changes a nonsecret revision cookie and retains the existing Next.js path revalidation. The streamed root revision signal notifies the browser and other tabs. Queries from the prior revision cannot populate the new namespace; a request racing a cookie change receives 409 and refreshes its scope. The invalidation is deliberately user-wide so shared wallets and transfers cannot leave another account stale.

The same screen can retain its previous value while its revision refreshes, preserving open dialogs and draft inputs. Placeholder values never cross users, accounts, resources, or filter/period changes, and are never written as successful responses into the new cache namespace. New responses update the screen. The server still validates permissions, amounts, versions, idempotency, and transaction invariants on every write.

## Background transaction prefetching

Once the active account Overview, monthly Transactions or monthly Analytics screen has its reference and visible data, an idle queue warms the selected month, two previous months, and the next month. It then warms the default rolling monthly trends data used on Analytics, ending with the previous complete month through the chart's shared date helper; historic trend years remain on demand. The window follows the selected month; prefetched results do not recursively expand it. Speculation uses the default unfiltered month, so arbitrary searches, wallet/status filters and pagination remain on demand. Year/custom Transactions views and editing screens do not start a queue. Year/custom Analytics warms only the default rolling trends window, without speculative transaction history.

Foreground and background reads share the exact query options and user/revision/account keys. Fresh prefetched data can therefore render on navigation without another workspace read. A successful Transactions response also fills the matching activity-summary cache from its existing summary, including income categories. Summary keys preserve period and filters but exclude history cursors. This avoids a second summary request on Analytics; a filtered transaction summary cannot satisfy unfiltered Analytics. Cancelled reads cannot seed summaries, and a newer or in-flight summary is preserved. An in-flight request survives navigation between the same account's Overview, Transactions and Analytics, including the interval before the destination mounts. Stale data still refreshes and writes invalidate the existing revision namespace.

Only one speculative request runs at a time, at low fetch priority, with an idle delay between requests. The queue yields to foreground queries and mutations, pauses while hidden/offline or on Data Saver/2G connections, and resumes on return. Leaving the account or logging out stops queued work and cancels inactive speculative reads. Access/revision failures stop the queue; ordinary speculative failures do not interrupt the visible screen. Prefetched snapshots use the existing persistence budgets and logout cleanup.

## Persistence and failure handling

Only financial values for owned accounts are dehydrated. Shared-account values stay in memory and are excluded from disk persistence. Disk-budget eviction applies only to owned queries, so it does not discard freshly prefetched shared data. Shared views retain their existing live membership refresh and server authorization. Successful invitation acceptance and sharing changes advance the acting browser's revision, clearing the prior namespace in that browser and its other tabs. Other participants retain their existing focus/poll refresh behavior. Response schema version 9 reflects the current budget payloads (earlier versions added account palettes, lifetime trends and income-category summaries). Incompatible versions are discarded even if the financial revision cookie did not change. The IndexedDB object-store version remains 1, independently of response versions, so this deployment does not require a database upgrade across open tabs. IndexedDB stores one versioned snapshot per user, capped at 60 recent queries and 20 MiB, with a 24-hour snapshot lifetime. Each restored response must also be less than 24 hours old; a newer snapshot cannot renew an older response. Oversized datasets are skipped. Inactive memory entries outside the retained budget are removed; active views remain usable. Authentication data and mutations are excluded. Restoration does not overwrite newer memory data.

Logout immediately cancels/removes financial queries and erases persisted snapshots, including in other open tabs. User switches remove the prior user's values; an unverified or rejected identity cannot display saved data. A confirmed signed-out visit also clears dormant snapshots.

Browser storage denial, quota failures, corruption, or eviction fall back to memory and server reads. A failed background refresh retains the last successful data and displays a saved-data notice with Retry. Access/revision/gone rejections (401/403/404/409/410) are excluded from persistence rather than being restored as successful saved values. The app does not queue offline financial writes. A new browser session must identify the user before showing saved financial data.

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

### Cache review performed on 2026-11-07

All 122 unit tests, scoped ESLint, TypeScript and the Turbopack production build passed. Actual generated Overview, Analytics and Transactions HTML retained public structure and Suspense boundaries without private fixture data. Next.js compilation/runtime diagnostics were clean; React inspection confirmed the current Analytics and prefetch components.

Using a disposable verified user, two accounts and five transactions, Overview warmed the four-month window plus rolling trends and income/expense summaries. Overview → Analytics → Transactions issued no duplicate fresh summary, trends or current-month history reads. Changing an expense from posted to pending changed the revision and refreshed both the saved summary and trend buckets; the income summary remained intact. Logout erased saved snapshots. Temporary database fixtures and browser state were cleaned up. Schema-version rejection, filter/account/user isolation, cancellation and delayed-response precedence were checked by unit tests. Imports, transfers, recurring schedule edits and multi-device sessions were not replayed in this review.

### Sharing and lifecycle audit performed on 2026-11-10

Reviewed the current shared-account loaders, theme metadata, bulk action invalidation, pending payments and lifetime reporting keys. Fixed successful sharing actions to advance the acting browser's workspace revision; fixed persistence-budget cleanup to retain shared prefetches in memory while continuing to exclude them from IndexedDB. Restoring a recent snapshot now independently rejects expired or future-dated responses. Cache schema remains v4; no response shape or database model changed.

All 150 unit tests, scoped ESLint, TypeScript and the isolated Turbopack production build passed. Actual Overview, Transactions and invitation shells retained public markup/Suspense without fixture data; Next.js compilation/runtime diagnostics were clean. React inspection confirmed the shared refresh and prefetch components. With disposable owner/member accounts, browser checks verified revision changes on invitation acceptance and leaving, no shared-account data in IndexedDB, zero additional current-month reads on prefetched shared navigation, and API 404 after leaving. After the disposable session was removed, a confirmed signed-out visit erased saved snapshots. Temporary users, accounts, invitations, memberships and sessions were removed. No invitation email was sent, and real financial records were untouched. Bulk mutations, owner-initiated remote revocation, theme editing and physical-phone behavior were not replayed in this audit; their existing server permission/invalidation paths were reviewed.

## Account appearance during streaming

The account palette has an independent authorized Server Component/Suspense boundary. It reuses the request-scoped account lookup and does not wait for membership lists or navigation permissions. Before the marker arrives, the workspace uses neutral light/dark colors and an appearance skeleton; account content is revealed with its saved palette already applied. The public page structure remains in prerendered HTML. Hidden retained layouts cannot supply a palette, and leaving the account route removes its colors. This avoids displaying cached palette guesses that could differ from another device's saved theme.

Verified on 2026-11-10 with disposable Ocean/Rose accounts: cold-load frame sampling, neutral pending light/dark states, hidden-layout exclusion, account switching and leaving the account route. The 150-test suite, TypeScript, scoped lint and production build passed; generated public HTML contains no private theme values.

## Budget navigation, preferences and cache retention

Budget section collapse choices are small, versioned localStorage preferences scoped by signed-in user and account. Only cadence booleans are saved; no plan names, financial values or authentication data are included. They survive refreshes, period/mode changes and financial revision invalidation, and sync across open tabs. Missing/corrupt storage defaults to expanded sections; failed writes fall back to memory for the current page session. Temporary reordering collapse does not write preferences. These UI preferences are independent of financial-cache logout cleanup.

Budget period and Actual/Smoothed changes use Next.js-integrated native history replacement and useSearchParams, rather than making a server-page navigation to change client query inputs. Cold periods load through the authenticated workspace API; cached periods render immediately, with stale results refreshing in the background. Each populated cadence warms just the previous and next summaries, then at most four current-period popup first pages, using the existing idle/foreground/network gates. An in-flight request can finish across same-account budget parameter changes; queues stop on logout or scope/route departure. Speculation never recursively widens its window.

Within the existing 60-query/20-MiB persistence budget, summaries and reference resources precede budget popup pages, with newest-first ordering within each class. Hover prefetching therefore cannot crowd out period summaries. Terminal response handling is shared by display, persistence and refresh status, so a 410 removed-budget response hides old popup data rather than persisting it as a successful value or claiming saved data is being shown. Financial writes still advance the user revision and invalidate every affected period/mode.

### Verification on 2026-11-11

All 175 unit tests, scoped ESLint, TypeScript and the isolated Turbopack production build passed. Budget prerendered HTML retains the public heading/instructions/Suspense without private fixture names. New unit regressions cover bounded cadence-aware prefetch plans, date boundaries, key equivalence/isolation, summary retention under popup pressure and rejected 410 persistence.

Disposable authenticated browser checks verified collapse persistence across reload, account/user isolation, corrupted preference recovery, denied-storage memory fallback, and retained collapse state after a budget edit. November → October → November used preloaded summaries with zero extra budget reads or server-page requests; Actual/Smoothed changes also avoided server-page requests. A mocked 410 on a previously loaded popup hid its cached value and displayed the removed-budget message. Revision invalidation on a real fixture budget edit, React component structure and isolated-server runtime diagnostics were checked. Logout cleared financial snapshots; temporary fixture users, accounts, budget plans, membership, sessions and preference keys were removed. No real financial transactions were changed. General transaction/transfer/import flows, every browser, multi-tab preference synchronization and physical phone behavior were not replayed in this session.
