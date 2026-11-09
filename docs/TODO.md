# App backlog

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
