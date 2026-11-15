# App backlog

## Visual polish and category icons

Requested on 2026-11-16; category icons implemented. Broader visual polish remains planned.

- [x] Add selectable category icons, with seeded defaults and a Tag fallback for existing categories. Subcategories inherit their parent icon unless an override is saved; clearing restores inheritance (2026-11-16).
- [x] Show category icons consistently in category management, shared transaction/budget selectors, transaction lists, category analytics labels/tooltips and budget transaction details (2026-11-16).
- [ ] Make the app more visually engaging with a consistent treatment of icons, color, empty states and key summaries. Review concrete designs before implementation; preserve readability, accessibility and mobile usability.

## Profile photos with Blob storage

Requested on 2026-11-16; planned, not implemented.

- [ ] Let users upload, replace and remove their profile photo in Settings using Vercel Blob storage, and show the saved photo wherever their avatar appears.
- [ ] Define image size/type limits, upload authorization and storage access; handle invalid uploads and failed saves, clean up replaced/deleted photos, and retain the initials fallback.

## Snapshot backups and restore

Requested on 2026-11-16; planned, not implemented.

- [ ] Automatically save recoverable snapshots and let the user create a snapshot manually.
- [ ] Add snapshot history with timestamps, automatic/manual labels and a clear restore action so the user can return to an earlier saved state.
- [ ] Decide snapshot scope (one financial account or all of a user's financial data), automatic schedule/triggers, retention limits and storage format/location. Define coverage for wallets, categories, transactions, recurrence, budgets and related settings, plus treatment of profile photos.
- [ ] Define who may create/view/restore snapshots for shared accounts and what happens to collaborators' changes. Keep authentication credentials and sessions outside financial-data restores.
- [ ] Preview the affected data before restore, require explicit confirmation, create a safety snapshot of the current state, and restore consistently with audit history, concurrent-write protection and retry handling. Refresh affected workspace caches afterward.
- [ ] Verify automatic/manual creation, access isolation, retention, corrupt/incompatible snapshots and successful recovery with balances and recurring schedules intact.

## Transaction workflow

- [x] Bulk selection: Posted/Pending, category, same-currency wallet moves and deletion, with recurring occurrence scopes and balance previews (2026-11-09).
- [x] Pending payments on Overview: overdue, this month and upcoming groups, wallet totals and quick posting.
- [x] Transfers between wallets within the same financial account.
- [ ] Import review/undo: per-import counts/totals, possible duplicate flags and undo one import.
- [ ] Bank reconciliation: compare a bank balance on a date with CentScope and investigate the difference.
- [ ] Linked refunds: associate a refund with its original purchase and report net category spending.

## Account linking and empty duplicate recovery

Planned on 2026-11-07; deferred, not implemented.

- [ ] Add Microsoft sign-in/linking for Outlook/Microsoft accounts.
- [ ] Allow explicit linking of providers with different email addresses from Settings, after verifying control of both identities. Keep the primary contact/recovery email unchanged.
- [ ] Handle accidental sign-up: when the provider already belongs to a separate, empty CentScope account, offer an explicit confirmation to connect it to the signed-in account the user wants to keep.
- [ ] Define empty using all financial records/history, including financial accounts, wallets and transactions; a zero balance is insufficient. Recheck emptiness on the server when completing the operation.
- [ ] Atomically move the provider login to the retained account and remove the empty duplicate without moving or deleting the retained account's financial data. Invalidate the duplicate's sessions and stale browser caches.
- [ ] If both accounts contain financial data, stop with a clear explanation. Merging populated accounts is a separate future feature requiring a preview and conflict handling.
- [ ] Verify normal linking, empty duplicate recovery, populated-account rejection, ownership checks, concurrent changes, retries and session invalidation.

Expected result: Google and Microsoft can open the same CentScope account and financial data, including after an accidental Microsoft sign-up created an empty duplicate.

## Longer-term items and open decisions

Carried forward from project notes; these are not approved implementation scopes.
Sharing, recurring budgets, same-account FX transfers and CSV import/export are already implemented. Earlier notes describing those as deferred are superseded.

- [ ] Subscriptions: choose billing scope, tiers, entitlements, payment provider, sharing sponsorship and downgrade behavior.
- [ ] Reporting currency conversion: decide rate source/timing and historical-rate behavior. Existing FX transfers already record exact sent/received amounts; budgets currently remain single-currency.
- [ ] Optional two-factor authentication and passkeys: decide supported methods and how protection applies to Google sign-in as well as passwords.
- [ ] Apple sign-in, when an Apple developer account is available.
- [ ] Email-address changes with verification and recovery rules.
- [ ] Financial-account ownership transfer and attaching/reusing existing physical wallets across accounts: define the intended permissions and lifecycle before implementation.
- [ ] Distributed authentication rate limiting before production; deliberately deferred until later at the user's request.

## Outstanding release verification

- [ ] Test actual PWA installation and standalone mode on physical iPhone/Android devices.
- [ ] Verify Google OAuth, verification/reset email handoff, import/export, session expiry and logout in installed mode.
