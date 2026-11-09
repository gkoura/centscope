# Domain schema draft

Status: financial accounts, wallets, categories, expenses/incomes and transaction status changes implemented, 2026-11-03. Migrations through `20261103170000_expenses_incomes` activate these slices. Memberships, budgets and adjustments remain drafts; transfers were activated by `20261104180000_wallet_transfers`;  recurrence was activated by `20261104150000_recurring_transactions`. Authentication tables remain unchanged. Do not use `db push` or blindly generate a full-schema migration: that would introduce the deferred domain draft.

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
- Category support was initially added for the ledger's same-account composite FK and is now used by the category services below. Budgets and membership tables remain unmigrated.
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


## Recurring expenses and income (2026-11-04)

- Migration `20261104150000_recurring_transactions` activates only the existing draft recurrence enum/tables, with cursor/version/end-count/stopped and optional spread-template fields. SQL checks restrict templates to expense/income, positive two-decimal amounts, non-transfer shapes, interval 1–120, end count 1–10,000, and expense-only spreading. Budgets, transfers and memberships remain deferred.
- A series is anchored to the first transaction's calendar date. DAILY/WEEKLY/MONTHLY/YEARLY intervals use original-date calculations; month ends/leap days clamp without drifting. Stored scheduledFor values encode local calendar dates at UTC midnight, not an execution instant. Generation compares them with today's date in the validated IANA timezone, avoiding DST/time-of-day ambiguity. Ends are inclusive; the total-count ending includes the first and skipped slots.
- Each generated transaction has one signed ledger entry and CREATED audit snapshot. Future generation defaults to PENDING, with explicit optional automatic POSTED. Existing occurrences' statuses do not change merely because time passes. Optional expense spreads are copied with a relative month offset, without additional ledger movements.
- Account locks serialize generation, commands, series edits, ordinary edits, status changes and deletion. Unique (ruleId, scheduledFor) slots plus deterministic recurring idempotency keys prevent duplicate generation. Deleting an occurrence marks its slot skipped and nulls its transaction FK; those slots survive. Wallet cascade deletion marks slots, stops source-wallet schedules, then archives wallet/allocation provenance. Category deletion is blocked while a recurrence references it.
- Only this occurrence changes one transaction and leaves template fields unchanged. This and future selects by the original scheduledFor date; All includes every surviving past/current/future occurrence. Both bulk scopes require confirmation, preserve actual occurrence dates, overwrite individual shared-field overrides, update the template, and write before/after audits for each affected transaction. Deleted/skipped slots are never recreated. Schedule changes affect ungenerated dates after the latest recorded slot, using the original anchor. Atomic bulk writes avoid per-row financial mutations.
- A series version increments for generation, schedule commands and every occurrence edit/status change/deletion, so a stale series form cannot overwrite a newer individual edit elsewhere. Transaction versions still protect individual edits. Stopped schedules remain stopped even if historical occurrences are subsequently edited.
- Pause holds generation; resume catches up missed dates using the selected generation status. Stop prevents further generation and preserves existing transactions. The protected daily cron and owner-authorized app checks share the same bounded runner: up to 20 schedules, 50 dates each, with atomic per-rule checkpoints. Large backlogs continue on subsequent checks. Invalid/archived category or ownership prevents generation; active schedules with unusable categories are paused.
- Unattended cron requires deployment CRON_SECRET and deployment of vercel.json. App-open/manual checks work without that secret. Missing/wrong cron Authorization returns 401; background execution is never public. No private data enters shared cache scopes or prerendered shells.


## Upfront Pending recurrence revision (2026-11-04)

This replaces the due-date generation/cron behavior above at the user's request.

- Finite schedules materialize all slots immediately in durable 50-date batches (maximum 10,000 slots). The initial batch is atomic with creation/conversion of the original transaction; client preparation continues remaining batches and resumes safely after interruption. Open-ended schedules materialize through one year after the later of today or the first scheduled date, replenished on app open. No scheduled runner or CRON_SECRET remains.
- Every generated copy is PENDING, including copies for past dates and templates whose legacy occurrenceStatus is POSTED. The original manually entered transaction retains its chosen status. The legacy preference column remains for compatibility, but form input cannot enable automatic posting. Marking a saved occurrence Posted remains an explicit user action.
- The generation cursor means first unprepared slot, not next due payment. hasMore reflects slots within the creation horizon, so client preparation ends rather than waiting for time to pass. Financial and audit writes are still transactional per batch, owner-authorized and idempotent under account locks/unique slots.
- Upcoming dates come from saved future Pending copies. Fully materialized schedules are labeled All instances created. Skip next deletes the next saved Pending transaction with a DELETED audit and a persistent skipped occurrence marker; it does not skip the far-away generation cursor instead. Pause/stop retain existing copies while preventing further preparation. All three edit scopes and historical confirmations remain in place; saved dates stay unchanged.
- Finite date/count validation rejects more than 10,000 calendar slots or a count extending beyond year 9999. No database shape change was needed for this revision. The recurrence migration remains additive and the ERD matches the schema.

## Recurring deletion scopes (2026-11-04)

- Recurring transaction deletion offers ONLY, FUTURE and ALL. FUTURE selects by original scheduledFor, including the chosen slot even if its actual payment date was corrected. ALL selects all surviving occurrences, including Posted history. ONLY preserves current series settings; FUTURE/ALL stop further generation so rolling-window preparation cannot recreate the deleted tail.
- Owner-authorized Repeatable Read previews provide exact affected Posted/Pending counts and balance deltas per wallet/currency. A SHA-256 snapshot covers selected references, rule version and affected transaction versions/entries. Confirmation rechecks it under the existing financial-account lock; any intervening generation, edit, status change or deletion invalidates the preview before writes.
- Every affected transaction gets a retained DELETED snapshot, including the original request key/fingerprint, occurrence slot, deletion scope/anchor/snapshot and expense-spread settings. Occurrence exclusions are marked before deleting transactions; ledger/spread rows cascade and prior audit live references null. Bulk audit writes are chunked at 500 while the entire scope remains atomic. Matching confirmation retries return without duplicate audits. No schema migration is required.


## Wallet transfers (2026-11-04)

- Migration `20261104180000_wallet_transfers` activates TRANSFER without adding unrelated draft tables. One transaction owns exactly two uncategorized ledger entries, on distinct allocations, with one negative and one positive amount. Deferred transaction/ledger shape triggers enforce the final shape at commit; same-currency amounts must cancel exactly. Cross-currency amounts remain independent exact two-decimal values. The historical single_entry trigger names now validate transfers too.
- Transfer creation, edits, status changes and deletion require current ownership of both endpoint accounts and wallets. All affected account IDs are locked in sorted order before sorted physical-wallet/allocation locks. Series changes include original template endpoints, current occurrence overrides, and proposed replacements; fresh scope checks reject newly introduced endpoints. Wallet cascade may include archived owned accounts, matching its existing policy.
- Transfer history is transaction-scoped (v2 occurredAt/id cursor), so both legs in one account appear as one row. Older ledger-ID cursors reset safely. Transfers stay within one account. Defensive counterpart redaction remains for unsupported legacy data. Category filters, expense suggestions, CSV imports and monthly expense analysis retain their expense/income semantics; transfers do not become income/spending.
- Same-currency transfer forms derive the received amount. Cross-currency forms require sent and received amounts, with an exact derived display rate and no external FX provider. Editing preserves each leg's original currency; wallet swaps are supported within that currency pair. Both entries are replaced atomically to avoid intermediate allocation-uniqueness collisions. Negative posted balances remain permitted.
- A shared PENDING/POSTED status controls both balance contributions, independently of date. Posting cross-currency Pending transfers requires explicit confirmation of actual sent/received amounts. Corrections affect that occurrence only, never the template. Unposting removes both contributions atomically; matching response-loss retries do not reapply balance movements.
- Recurrence templates now support a destination and exact destination amount, with no category/spread. Generated copies remain PENDING and use the same upfront finite/rolling-year batches. Both account views can list/replenish/control a schedule. All three edit/delete scopes preserve original slot semantics, audit each transaction, and retain skipped/deleted exclusions. Series versioning includes individual edits/status changes and template updates.
- Every audit records both endpoints/accounts and amounts/currencies. Transfer deletion always removes both legs; previews calculate the Posted balance delta per wallet/account. Matching deletion receipts are retry-safe within the owning account. Creation keys/fingerprints and durable deletion tombstones prevent stale form replay from resurrecting a deleted transfer.
- Wallet cascade includes whole transfers touching the deleted physical wallet, expands account/wallet lock scope to counterparts, previews counterpart balance changes, and preserves unrelated counterpart transactions/metadata. It stops templates referencing the wallet as source or destination. Foreign-linked accounts or changed scope invalidate the entire confirmation rather than partially deleting one side.
- Fees remain separate expenses. Transfer CSV import, shared-account permissions, rate-provider conversions and partial settlement are out of scope.

### Same-account transfer revision (2026-11-04)

- Cross-account transfers were removed by user decision. Transfers are only between two different wallet allocations within one financial account; cross-currency wallets remain supported within that account.
- Migration `20261104190000_same_account_transfers` enforces the same-account boundary in deferred ledger shape validation and recurrence template validation. It rejects existing cross-account records rather than deleting or reclassifying them. Server create/edit validates both endpoints against the context account, wallet options are account-scoped, and generation rejects cross-account templates.
- Personal → Home is modeled manually as an expense with the Home category in Personal and an income in Home, so account spending/income analysis includes it. No automatic expense/income conversion or linking is introduced. Earlier cross-account implementation notes above are superseded by this revision.

## Account workspace read semantics

- The first active account in the existing owner-scoped `sortOrder` is the default landing account. No separate default-account field is stored; reordering updates the default across devices.
- The account workspace displays all-date posted balances per currency, independently of transaction-period filters. Period activity is derived from qualifying owned ledger entries, counts distinct transaction IDs, excludes transfers/openings from income and spending, and separates currencies. Pending-only filters explicitly switch flow totals to pending entries.
- Month history is unpaginated. Year/custom history uses `(occurredAt, id)` keyset pagination in both directions; summaries remain scoped to the complete filtered period. Inclusive calendar end dates are queried with `occurredAt < next UTC midnight`, preserving entries with non-midnight timestamps.

### Composite wallet filters and smoothed balance history

- Transaction wallet filters accept a single allocation ID, repeated `wallet` query keys, or a canonical comma-separated list (deduplicated, at most 100 IDs). Selected wallets are combined with OR, beneath the existing owner/account scope. An empty selection includes all wallets. Lists and period summaries use the same group; an internal transfer matching both selected wallets is shown/counted once.
- Overview category spending rolls subcategory entries into their root category without changing stored ledger categories.
- The rolling 12-month balance chart is a read-only analytical balance, per currency and active wallet allocation. Posted non-spread movements retain their transaction month. Each posted spread expense replaces its original cash deduction with the cumulative scheduled shares through each month end; prior-month shares carry into the displayed window. Cent remainders follow the same earliest-month rule as `monthlyShare`. Pending entries are excluded. Current/future months use recorded entries only, with no forecast or FX conversion. Recorded ledger balances and existing detailed spending analysis remain unchanged.

## Full account deletion (2026-11-06)

The auth deletion hook explicitly removes the user's shipped financial records
and retained audit snapshots before deleting the user, all in one Serializable
transaction. Existing RESTRICT/CASCADE constraints remain intact. Any unsupported
foreign/shared reference aborts the entire purge. User deletion cascades to auth
sessions and linked provider accounts. No draft budget/membership tables are
assumed to exist. Ordinary transaction deletion continues to retain its audits.

## Financial account sharing (2026-11-09)

Migration 20261109100000_account_sharing adds account memberships and single-use invitations. Each verified member uses the standard account workspace and may manage its finances. Only FinancialAccount.ownerId can invite or revoke others. Both historical AccountRole values grant the same financial access; new records use COLLABORATOR. The account row lock serializes financial and membership changes. Audit actors and transaction creators identify the actual user. Physical wallet-wide changes require access to every affected account. Owned-account ordering stays personal, and shared financial queries stay out of IndexedDB.

## Bulk transaction actions (2026-11-09)

- No schema migration. Bulk status/category/wallet/deletion uses existing transactions, ledger entries, recurrence exclusions and TransactionChange audits. Authorize owner/member access under the account lock, then lock sorted physical wallets/allocations and transaction rows; revalidate the selection and targets before writing. Selected versions and preview fingerprints reject stale transactions, series, scope or target metadata.
- Selections are limited to 2,000 rows; expanded ONLY/FUTURE/ALL scopes to 10,000 surviving transactions. FUTURE uses the earliest selected original scheduledFor per series, independently of corrected payment dates. Expansion deduplicates multiple selected occurrences. All entries and template endpoints must belong to the authorized account and its owner; opening balances and unsupported/archived movements are rejected.
- Category changes require matching expense/income types across all affected rows/templates. Wallet changes preserve currency and are limited to single-entry expenses/income. Only the chosen field changes; dates, amounts, expense spreads and other occurrence overrides remain intact. Broader category/wallet scopes update templates; status changes never enable automatic posting. Every affected rule version is incremented once, including individual occurrence edits.
- Pending FX posting requires explicit actual sent/received amounts per transfer and a second confirmation. Both legs commit together; recurring estimated amounts remain unchanged. Posted balance previews sum integer cents with BigInt, including totals beyond Decimal's default arithmetic precision. No additional financial movements are created.
- Every changed transaction receives a retained before/after audit with actor/shared-account context, original creation fingerprint/key, spread and scheduled slot. Broader deletions stop the template and mark selected slots skipped before deleting complete transactions. Unaffected occurrences survive. Audit inserts and FX writes use batches of 500 within one atomic database transaction.
- BULK_COMPLETED is an audit receipt with actor, financialAccountId, bulkRequestId (UUID), canonical requestFingerprint and changed-row count; it intentionally has no live transaction reference. The account lock serializes duplicate requests. An identical retry returns the saved result even after deletion; reusing the UUID with different input is rejected. Existing per-transaction deletion tombstones remain compatible with creation replay checks.
