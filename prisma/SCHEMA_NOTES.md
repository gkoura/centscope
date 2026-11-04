# Domain schema draft

Status: financial accounts, wallets, categories, expenses/incomes and transaction status changes implemented, 2026-11-03. Migrations through `20261103170000_expenses_incomes` activate these slices. Memberships, recurrence, budgets, transfers and adjustments remain drafts. Authentication tables remain unchanged. Do not use `db push` or blindly generate a full-schema migration: that would introduce the deferred domain draft.

## Implemented financial-account slice

- The current user becomes both owner and creator; these IDs are derived exclusively from the verified server session. Listing and detail queries require current ownership and exclude archived accounts. Non-owner memberships, invitations, and ownership transfer remain deferred.
- Names are trimmed and validated on the server (1–80 characters; no control/format characters). The database adds `financial_account_name_check` for trimmed length and `financial_account_currency_check` for three uppercase ASCII currency letters. These CHECK constraints are not represented in Prisma.
- Creation currently offers EUR, GBP, and USD. Reporting currency is stored as account metadata; no exchange rates or converted totals are implemented.
- Owner and creator foreign keys use RESTRICT on deletion. No account deletion or user deletion flow is added by this slice.

## Implemented wallet and opening-balance slice

- A verified account owner may create a new owned wallet and its allocation in an active owned financial account. Reusing/attaching existing wallets, sharing, ownership transfer, editing, deletion and archival UI remain deferred. Reads expose allocation balances only, never the sum of all allocations in a physical wallet.
- Wallet currency is independently selected from EUR/GBP/USD. All currently supported wallet currencies use two decimal places. Parse money as decimal strings (up to 16 integer digits, matching Decimal(24,8) capacity), construct Prisma Decimal directly, aggregate in PostgreSQL, and format without conversion to Number. Negative opening balances are supported; blank/zero creates no transaction or ledger entry.
- Nonzero openings are uncategorized OPENING_BALANCE transactions with exactly one ledger entry and a CREATED TransactionChange snapshot. Status defaults to POSTED but may explicitly be PENDING; date does not determine status. Actual balances sum POSTED entries only, with no date cutoff. Balance dates are calendar dates stored as UTC midnight; date input defaults to the current UTC date. No FX conversion or mixed-currency total is performed.
- Wallet, allocation, transaction, ledger entry and audit snapshot are saved atomically. The account row is locked while verifying current ownership/archival and creating the wallet. Future ownership/archival services must respect this lock. A form UUID becomes the wallet ID and keys the opening transaction; same-payload retries reuse the result, changed-payload retries are rejected. Zero-balance retries are idempotent too; their unused date/status are not recorded as money movements.
- Category support was initially added for the ledger's same-account composite FK and is now used by the category services below. Recurrence, budgets and membership tables remain unmigrated.
- Database CHECKs: wallet names have trimmed length 1–80; wallet currency is EUR/GBP/USD; ledger amounts are finite, nonzero and exact to two decimal places; transaction version is positive. `transaction_supported_type_check` now admits OPENING_BALANCE, EXPENSE and INCOME. **Transfers and adjustments require a new migration extending this CHECK and the shape validator.** Enum values alone do not activate those features.
- Deferred constraint triggers (now named `transaction_single_entry_shape` and `ledger_entry_single_entry_shape`) enforce final transaction shape at commit. A failed shape check rolls the entire transaction back. Wallet currency cannot change after ledger history exists (including pending history); allocation wallet/account references cannot be reassigned after history exists. These triggers and CHECKs are not represented in Prisma.
- Audit snapshots are append-only through the application service; retention and database-level audit immutability remain deferred. Status changes are supported below. Amount/name/date/wallet edits, transaction deletions and currency edits remain deferred. No approved posted-history correction policy is implied by this slice.

## Default categories and hierarchy

- New account creation atomically seeds seven expense roots (Food & drink, Home & bills, Transport, Shopping, Health, Leisure, Other expenses) and two income roots (Salary, Other income), with no subcategories. Migration `20261103160000_default_categories` backfills missing defaults into existing active accounts without overwriting custom categories.
- Account owners can add roots/subcategories, rename them, and archive them. Archiving a root archives its active children in the same transaction; financial history and category references remain intact. Archiving does not reseed defaults on subsequent reads. An archived name may be reused for a new category.
- The partial expression index `category_active_sibling_name_key` makes active sibling names unique within account/type/parent, ignoring surrounding spaces and case. It is not representable in Prisma.
- `category_name_check` enforces trimmed length 1–80. The `category_hierarchy` trigger requires a same-account, same-type, top-level parent and prevents active children under archived roots. Type, account and parent are immutable after creation; only names and archive state change. These rules prevent deeper levels and cycles. These constraints/triggers are not represented in Prisma.
- Category mutations lock the account row, authenticate its current verified owner, and check the category scope. Renaming/archiving uses an expected updatedAt timestamp; rename timestamps advance monotonically to detect stale forms. Direct parent archival with active children is rejected by the database; the service archives children first.
- Permanent category deletion is allowed only when neither the category nor any of its children is referenced by a ledger entry. This includes archived children and every transaction status/date. Deleting a root removes its children first and then the root in one database transaction; deleting a subcategory leaves its parent and siblings intact. A used child blocks the entire root deletion, with no partial changes. The account lock serializes this check against application transaction/category creation, and restrictive foreign keys remain the final safeguard against concurrent references. Deletion also checks the expected updatedAt timestamp. No database cascade or transaction deletion is introduced.

## Expenses, incomes and status changes

- A new expense/income requires one active owned wallet allocation and one active same-account category of the matching type. A root or subcategory may be selected. Amount input is strictly positive, exact to two decimal places; the server writes a negative expense entry or positive income entry. Currency comes from the wallet, never request input. Notes are optional and limited to 2,000 characters.
- Transaction creation, its one ledger entry and CREATED audit snapshot commit atomically. The account and wallet/allocation are locked while checking current access. A creator-scoped form UUID key and fingerprint stored in the creation audit make identical retries idempotent, even after a later status change. Changed-payload replay is rejected.
- Opening balances remain uncategorized. Deferred `validate_transaction_shape` requires exactly one entry: an expense must be negative with an expense category; income must be positive with an income category. Composite FKs enforce account scope. Transaction names have trimmed length 1–120. These rules also apply to pending transactions, independently of date.
- Owners may switch POSTED ↔ PENDING for expenses, incomes and opening balances, regardless of date. Status changes increment version and append a STATUS_CHANGED audit snapshot atomically. Ledger entries are unchanged; inclusion in posted sums determines the balance effect. Expected-version checks reject conflicting stale updates and make duplicate one-step retries harmless without duplicate audit rows.
- Archived categories remain valid historical references and do not block status changes on existing transactions. New transactions cannot select archived categories or wallets. History preserves archived wallet/allocation records, with status controls disabled for archived wallets/allocations.
- History uses account-scoped keyset pagination of 25 entries ordered by actual occurredAt then ledger ID, both descending. Cursor input never widens account permissions. Amounts remain in each wallet's currency; no mixed-currency totals or FX conversion are performed.

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

## Additional domain invariants

Prisma validation checks schema structure, not these business invariants. Implement database checks/triggers where appropriate in the reviewed migration and transactional server checks for authorization and cross-row rules.

1. Validate supported uppercase ISO currency codes, currency-specific minor-unit precision, positive/nonzero amounts, recurrence interval > 0, valid dates, and IANA time zones. Decimal scale 8 is storage capacity, not permission to enter fractional cents. Budget limits must be positive and conversion rates positive.
2. Enforce transaction shape: EXPENSE/INCOME exactly one correctly signed entry, TRANSFER exactly two different allocations with opposite signs, and OPENING_BALANCE/ADJUSTMENT exactly one nonzero entry. Transfer categories must be absent. Same-currency transfer amounts must cancel exactly; cross-currency transfers preserve both exact amounts. Multi-row shape validation should be deferred until commit.
3. A status transition, transfer creation/edit/deletion, occurrence generation, audit append, and related valuation updates must be atomic. Use optimistic concurrency (`version`) or locking. Idempotency keys and occurrence uniqueness prevent duplicate operations; they do not replace concurrency handling.
4. Two-level category depth, no cycles/self-parent, matching category types, and required expense/income categories are now enforced for implemented writes. Recurrence categories must eventually match the source account/type too.
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
- FX provider/cache, account reporting conversions, background recurrence execution, transaction editing/deletion and transfers.
- Refund/reporting semantics, bank reconciliation/source-specific imports, and split transactions.

Unimplemented FX, wallet sharing, history corrections and broader audit policies remain reviewable draft choices. The implemented account ownership and wallet/opening-balance behavior is documented above.

## Category display order

- `Category.sortOrder` stores a zero-based sibling position. The SQL constraint `category_sort_order_nonnegative` rejects negative values; positions are deliberately not unique, allowing transactional renumbering without temporary index conflicts.
- Sibling groups are scoped by financial account, type, and nullable parent ID. Reads break position ties by name and ID. The migration backfills the previous alphabetical order, including archived rows; active categories retain their relative order.
- Reordering verifies the full previous active sibling order under the same financial-account row lock used by category creation, archival, deletion, and transaction writes. A changed order or membership rejects the reorder instead of overwriting another session. All new positions commit together; changed rows advance `updatedAt` to preserve edit conflict detection.
- Newly created categories append to their active sibling group under that lock. Default categories start in alphabetical order within their type. Reordering never changes a category's parent or type. Archive/delete can leave gaps; the next reorder normalizes positions.

- Category ordering now uses an explicit draft/save workflow. A Save order request can include multiple sibling groups (across types and parents); all are checked and written under one account lock and one transaction. A conflict in any group rolls back the entire batch. Dragging and canceling do not write to the database.


## Incremental CSV imports (2026-11-03)

- Import validation accepts up to 2,000 rows and 2 MB before issuing user/account-bound signed batches, each expiring after 24 hours. The file remains in client memory; no import-job schema or external queue is required.
- Each batch contains at most 50 rows and runs in its own database transaction under the financial-account lock. Wallet ownership/archive state and category type/archive state are checked again for new rows. Transaction, ledger and CREATED audit records use bulk inserts and commit together; a batch failure rolls back that batch only. Earlier batches remain committed.
- Each row keeps the existing creator-scoped `manual:<UUID>` idempotency key derived from account, exact CSV bytes and row position. Original CREATED request fingerprints are compared on retries, including after transaction edits/status changes. Identical replays skip saved rows before checking whether their old category/wallet remains active. Changed CSV files are new imports and may overlap prior files.
- Client progress advances only after confirming a committed batch. If a response is lost, retrying the uncertain batch is safe. Pause finishes the in-flight batch; reload/closing stops future batches, and re-uploading the exact same file resumes by skipping saved rows. Imports do not run in the background after the browser closes. No database model or migration changed.

## Dashboard account and wallet display order

- `FinancialAccount.sortOrder` is scoped to its owner; `AccountWallet.sortOrder` is scoped to its financial account. Ordering belongs to the allocation so one wallet can occupy a different position in each account.
- SQL checks reject negative positions. Positions are not unique so transactional renumbering can update rows without temporary index conflicts. Reads break ties using the original created-at order and ID.
- The migration preserves existing account order (created descending, ID ascending) and wallet allocation order (created ascending, ID ascending), partitioned by owner/account respectively.
- Account creation and reordering lock the owner's user row; wallet creation and reordering lock the owning financial-account row. New active items append to the active list. Future account archival/ownership writers must coordinate with the owner-row lock too.
- Reordering validates the complete previous active ID list inside the lock and saves all positions atomically. Foreign IDs, duplicates, changed membership or stale order reject the entire operation. Financial balances, allocation identities and ledger history are untouched.


## Expense/income deletion (2026-11-03)

- Explicit owner-confirmed deletion is supported for POSTED and PENDING expenses/incomes on active owned accounts and wallets. The account row lock serializes it with edits, status changes, imports and category deletion. Expected transaction version prevents stale deletion; opening balances are excluded.
- A DELETED audit snapshot and transaction deletion share one transaction. Cascaded ledger deletion removes the old posted-balance contribution; PENDING deletion has no balance effect. Existing audit rows survive through `liveTransactionId ON DELETE SET NULL`. Snapshot category/wallet names preserve readable history if those resources are later renamed/deleted.
- DELETED snapshots retain the original idempotency key and request fingerprint. Import retry lookup includes these tombstones, preventing exact-file retries from recreating deleted rows. Stale manual-create forms with deleted keys are rejected. Identical delete retries find the matching account/version tombstone and do not write duplicate deletion audits. No model/migration changes are required.
- Owner-list serialization uses `FOR NO KEY UPDATE` on the user row: it serializes account creation/reordering while allowing foreign-key key-share checks from concurrent wallet creation, avoiding a user-row/account-row lock cycle.


## Wallet opening-balance corrections (2026-11-03)

- The wallet editor can correct the account allocation's opening amount/date/status, including negative amounts. Account ownership, active allocation/wallet ownership and expected wallet timestamp plus opening ID/version are checked under locks. Other allocations of the physical wallet are unaffected financially.
- Existing nonzero corrections update the OPENING_BALANCE transaction and its sole uncategorized ledger entry atomically with an UPDATED before/after audit snapshot. POSTED alone controls actual balance contribution; date never forces status.
- A zero correction removes the opening transaction/ledger entry and creates OPENING_BALANCE_CLEARED in the same transaction. Prior and clearing audits survive with null live references. This preserves the existing nonzero-entry database constraint instead of storing a zero ledger movement. A wallet without an opening creates no movement for zero, or creates a new audited opening for a nonzero amount.
- A monotonically advanced physical-wallet updatedAt protects opening-only writes and creation/clear retries. The opening transaction version additionally detects status changes made through history without a wallet metadata update. No schema/migration changes are required.


## Wallet deletion cascades (2026-11-03)

- Wallet Delete is a physical-wallet-wide operation: all allocations/financial accounts are included, including archived allocations/accounts. The caller must own every affected account and the physical wallet. The selected account must still be active and owned. No membership-based access is sufficient for this cascade.
- Sorted account locks precede wallet/allocation locks, matching existing financial mutation order. A freshly recomputed scope hash prevents deleting transactions or account allocations added/changed since confirmation. Linked/multi-entry/unsupported transaction types block the whole operation.
- DELETED audit snapshots are bulk inserted and all wallet transactions are removed atomically; ledger entries cascade and live audit references become null. Deletion snapshots include original request fingerprints/idempotency keys, current money/status/date/notes and wallet/category names, plus walletDeleted=true.
- Wallet/allocation rows are retained with archivedAt as internal deletion markers, preserving provenance and preventing stale creation retries from reusing wallet IDs. No active wallet or financial entries remain. Completed retries return without duplicate audits. These deletion markers are not exposed as a restore workflow. No new schema/migration or automatic FK cascade on wallets is required; application authorization and explicit atomic transaction deletion remain mandatory.

## Expense spreading and monthly analysis (2026-11-04)

- `ExpenseSpread` is an optional one-to-one transaction companion. Its transaction ID is the primary key and cascades on deletion. It never creates ledger entries or recurrence occurrences. Existing wallet balances continue to use the original signed POSTED entry exactly once.
- SQL checks enforce a nonzero four-digit start year, a valid month, and 2–120 months. Application validation additionally requires the final month to remain within year 9999 and allows spreading only expenses. Changing an expense to income removes its spread in the same locked/versioned update.
- Monthly shares are derived using integer cents: equal quotient plus one cent in each earliest remainder month. No floating-point money or stored derived allocations. Schedule edits are retroactive analysis changes; date edits retain the explicit start month. CREATED/UPDATED/DELETED snapshots preserve spread settings, including wallet cascade audits.
- Monthly analysis reads only authorized POSTED expenses, separately by wallet currency, with no implicit currency conversion. Smoothed mode substitutes the month's share for the original payment; actual mode uses payment date/amount. Future months and future-dated source payments are planned, excluded from spending/category totals and comparisons. Pending expenses keep settings but contribute nothing. Month boundaries use UTC transaction dates.
- CSV remains unchanged. Imported transactions can be spread through the editor. Existing placeholder transactions are never converted or removed automatically.
- Wallet detail reads and monthly analysis relation reads use Repeatable Read snapshots so concurrent transaction/wallet deletion cannot leave a partially loaded opening or expense relation in the response.
