# Domain schema draft

Status: domain draft with first approved slice implemented, 2026-11-03. Migration `20261103120000_financial_accounts` creates only `financial_account`; the remaining domain models are not migrated. Authentication tables remain unchanged. Do not use `db push` or blindly generate a full-schema migration: that would introduce the deferred domain draft.

## Implemented financial-account slice

- The current user becomes both owner and creator; these IDs are derived exclusively from the verified server session. Listing and detail queries require current ownership and exclude archived accounts. Non-owner memberships, invitations, and ownership transfer remain deferred.
- Names are trimmed and validated on the server (1–80 characters; no control/format characters). The database adds `financial_account_name_check` for trimmed length and `financial_account_currency_check` for three uppercase ASCII currency letters. These CHECK constraints are not represented in Prisma.
- Creation currently offers EUR, GBP, and USD. Reporting currency is stored as account metadata; no exchange rates, converted totals, wallets, or balances are implemented.
- Owner and creator foreign keys use RESTRICT on deletion. No account deletion or user deletion flow is added by this slice.

## Reading the model

- Better Auth's `Account` remains an authentication provider identity. `FinancialAccount` is Personal/Home/etc.
- `FinancialAccount.ownerId` is the single current owner/admin; `createdById` preserves the creator. Non-owner roles live in `AccountMembership`. This avoids needing a partial unique index for exactly one owner membership.
- A `Wallet` is a physical bank/cash location with one currency. `AccountWallet` allocates its money to a purpose. The wallet owner controls attachment; account members can access only authorized allocations. This ownership policy is a proposal pending review.
- `Transaction` stores shared metadata and explicit PENDING/POSTED status. `LedgerEntry` stores signed wallet-currency amounts. Expense: one negative entry; income: one positive entry; transfer: one negative and one positive entry. Opening balances and corrections are explicit operations.
- Ledger entries exist for pending transactions too. Actual balance is SUM(entry.amount) filtered by POSTED transactions, without a date cutoff. As-of balances additionally filter transaction date. Changing status changes inclusion, not entry amounts.
- Transfer entries are the source/destination amounts, including FX transfers. Never add amounts in different currencies. Fees use separate expense transactions.
- Select a root category or a subcategory; its parent is derived. Composite foreign keys enforce that ledger categories and allocations belong to the same financial account. Category parents and budget category filters are also account-scoped.
- `RecurrenceRule` contains a typed template, time zone, cadence, and generation cursor. For incomes, `source` is the receiving allocation; for expenses it is the paying allocation. `destination` is used only for transfers. All template amounts are positive; the generator creates signed entries.
- `occurrenceStatus` is a generation preference, independent from cadence. Each generated transaction can switch statuses freely. A future transaction can be posted, and an overdue transaction can remain pending.
- `RecurrenceOccurrence` has a unique original schedule slot. Deletion clears its transaction reference but retains the slot. Skip/deletion handling sets `skippedAt` in the same operation; generation must never recreate an existing slot.
- `Budget` owns its currency, memberships, account scopes, and explicit periods. Scope categories filter spending; selecting a parent includes its children. No filters means all expenses, including uncategorized expenses, in the scoped account. These matching semantics are proposed.
- `BudgetPeriod` uses [start, end) boundaries and a spending limit. Explicit periods allow monthly, annual, or custom windows without assuming a renewal cadence yet.
- `BudgetValuation` snapshots an included expense in budget currency. It is derived reporting data, not a balance. `exchangeRate` converts wallet currency to budget currency; same-currency rates are 1. Positive amount is spending consumed. Only matching POSTED expenses count. Invalidate/recompute snapshots atomically when amounts, scope, dates, currencies, or status change; retain the original historical rate where appropriate. Backfilling older expenses needs a defined historical-rate policy.
- `TransactionChange` preserves domain audit snapshots even when a pending transaction is deleted. Its stable transaction ID is intentionally not a foreign key; the optional live reference clears on deletion. Audit access follows account permissions and snapshots must never contain auth secrets.

## Required before the first migration and write services

Prisma validation checks schema structure, not these business invariants. Implement database checks/triggers where appropriate in the reviewed migration and transactional server checks for authorization and cross-row rules.

1. Validate supported uppercase ISO currency codes, currency-specific minor-unit precision, positive/nonzero amounts, recurrence interval > 0, valid dates, and IANA time zones. Decimal scale 8 is storage capacity, not permission to enter fractional cents. Budget limits must be positive and conversion rates positive.
2. Enforce transaction shape: EXPENSE/INCOME exactly one correctly signed entry, TRANSFER exactly two different allocations with opposite signs, and OPENING_BALANCE/ADJUSTMENT exactly one nonzero entry. Transfer categories must be absent. Same-currency transfer amounts must cancel exactly; cross-currency transfers preserve both exact amounts. Multi-row shape validation should be deferred until commit.
3. A status transition, transfer creation/edit/deletion, occurrence generation, audit append, and related valuation updates must be atomic. Use optimistic concurrency (`version`) or locking. Idempotency keys and occurrence uniqueness prevent duplicate operations; they do not replace concurrency handling.
4. Enforce two-level category depth, no cycles/self-parent, matching parent/child category type, and transaction category type. Require a category for expense/income if the final UX requires it; currently optional to permit uncategorized entries. Recurrence categories must match the source account/type too.
5. Owner cannot also have a non-owner membership. Ownership transfers, wallet attachment, and all reads/writes require server authorization. A wallet connection to an account must not expose that wallet's other allocations. Financial history prevents destructive cascading deletion of users/accounts/wallets; archival is the default. Account deletion/privacy policy needs explicit design.
6. Budget collaborators require FULL visibility. Only owners manage sharing. Full budget viewers receive only matching details; summary viewers receive safe aggregates with no raw notes, IDs, or source details. Budget editing grants no underlying transaction edit rights. Sharing account data through a budget requires authority from each included account, and membership revocation must immediately stop unauthorized disclosures.
7. Check budget period start < end and prevent overlapping periods within one budget, preferably with a PostgreSQL exclusion constraint. Decide whether scope/limit edits affect past periods before implementing historical reports. Budget currency must not change once valuations exist without an explicit conversion/rebuild.
8. Define recurrence behavior at month ends (proposed: clamp to last day), leap days, DST, end boundaries, missed runs, and rule edits. Use the original local anchor to avoid drift. Recheck permissions and archived resources when generating; handle revoked access without endlessly retrying unauthorized writes. Future FX amounts remain estimates until confirmed if generated pending.
9. Wallet currency must be immutable after ledger history exists; never reinterpret stored amounts. Changing reporting currency affects display only. Select an FX source, historical rate timing, missing-rate handling, and rounding policy before implementing converted totals or valuations.
10. Audit snapshots must be append-only through the service, include affected account IDs and before/after data, and have a retention/privacy policy. Posted deletion/correction semantics remain unresolved; pending deletion is approved. Restrict direct database access accordingly.

## Deliberately deferred

- Subscription billing, payment provider, entitlements, downgrade behavior.
- Invitation delivery/acceptance (memberships currently reference existing users).
- Category-specific spending caps inside a period; category inclusion filters are present.
- FX provider/cache, account reporting conversions, background recurrence execution, and all mutation services.
- Refund/reporting semantics, bank reconciliation/imports, and split transactions.

The proposed reporting currencies, FX snapshots, owner representation, wallet sharing policy, and audit model are reviewable draft choices, not newly confirmed product decisions.
