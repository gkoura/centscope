# CentScope

Make sense of every cent.

CentScope is a personal finance tracking app built with Next.js and shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## Tests

Unit tests live in [`tests/unit`](tests/unit). See the [testing guide](tests/README.md) for coverage, conventions, and commands to run when needed.

### Bulk transaction actions

In Transactions, choose **Select transactions**, tick individual rows or **Select shown**, then open **Bulk actions**. Mark entries Posted/Pending, change their category, move them to another wallet in the same currency, or delete them. Selection applies to the current page and filters, up to 2,000 rows; opening balances remain editable through their wallet. Category changes require all selected entries to be expenses or all income. Wallet moves support expenses/income in one currency; edit transfer endpoints individually.

Recurring entries offer **Only selected occurrences**, **This and future occurrences**, and **All occurrences including past**. Future starts at the earliest selected original scheduled slot in each series. Broader scopes can affect entries outside the visible filters, up to 10,000 transactions. Category/wallet changes also update the template; status changes affect saved copies only, and generated copies remain Pending. Broader deletion stops the series, while individual deletion preserves its exclusion slot.

Every action requires a fresh preview of the affected counts and exact Posted balance changes. Posting Pending FX transfers additionally requires actual sent/received amounts for each transfer. Changes commit together, reject stale previews, retain audits, and support identical retries after an interrupted response. Deletion is permanent and removes both transfer legs together.

### Recurring transactions

Enable **Repeat** on an expense or income, or edit an existing transaction to start a series. Future copies are created **upfront as Pending**; they never post automatically. The original transaction keeps the date/status you select. Mark each Pending payment Posted when it happens. Dates alone do not affect balances.

Schedules with an end date or occurrence count prepare every scheduled copy (up to 10,000 slots). Open-ended schedules maintain a rolling 12-month window, starting from the first date if it is in the future. Opening the account, transaction list, analysis, or recurring page replenishes that window. No cron job, secret, or background scheduler is needed.

Creation is incremental and retry-safe. The first batch is saved with the original transaction; the page automatically prepares the remaining copies and shows progress. Closing the page stops further requests; reopening or choosing **Prepare pending transactions** resumes from the saved cursor. Skipped/deleted copies are never recreated.

The editor supports **Only this occurrence**, **This and future occurrences**, and **All occurrences (including past)**. Series edits preserve existing dates, overwrite shared details, and require confirmation because amounts, wallets and Posted/Pending status can change balances. Cadence changes apply only to dates that have not been prepared yet; edit an individual occurrence to change its saved date. Stopping or pausing holds further creation and leaves existing transactions intact. **Skip next** removes the next saved Pending copy, with an audit and retained exclusion slot.


### Wallet transfers

Use **Transfer** in transaction history or on a wallet card. Choose source and destination wallets within the current account. Same-currency transfers use one amount; cross-currency transfers require the exact amount sent and received. Fees are separate expenses. Transfers affect wallet balances, not income or spending, and appear once in history with both endpoints.

Pending FX transfers ask you to confirm actual amounts before posting. Posting/unposting affects both wallets together; dates never change status. Edit preserves each leg’s currency. Repeat prepares future two-sided Pending copies using the existing fixed ending or rolling 12-month window, with Only / This and future / All scopes. Deletion previews both wallet effects, and deleting a wallet removes whole linked transfers while keeping unrelated transactions in the other wallets.

Transfers are limited to wallets in the same financial account. Record money sent from Personal to Home as a categorized expense in Personal and income in Home; these are separate transactions.

### CSV export

In Transactions, open **Transaction tools → Export CSV** to choose an independent export period. The dialog starts at this month, regardless of the period shown on the transactions page. Choose This month, Last month, This year, All time, or a custom range; jump directly using the calendar’s month/year dropdowns, select the start/end days, or type YYYY-MM-DD dates. Both dates are included. Search, wallet(s), category, type and status filters still apply, across all pages. A range with no matching transactions produces a header-only file. Custom export requests require explicit valid start/end dates and reject missing, impossible or reversed ranges rather than substituting another period. All time shows the account’s earliest and latest transaction dates (including Pending/future transactions); the server downloads all matching records at request time, so changes after the preview are included. Empty accounts can download a header-only CSV.

The CSV uses UTF-8 with a BOM, CRLF rows, ISO dates and exact decimal amounts. Its first nine columns follow the import template; additional columns include currency, transfer destination/amount/currency, spread settings, series ID and transaction ID. Expenses use positive payment amounts; opening balances keep their sign. Transfers appear once, always source → destination, even when filtering by the receiving wallet. Posted and Pending are preserved. Export reports do not recreate recurring schedules or spread settings through import, and the importer still does not support transfers/opening balances or this report’s extra columns. Use the sample import template when preparing a re-import. Text cells that could run as spreadsheet formulas receive a leading apostrophe.

Date calendars throughout the app use direct month/year dropdowns alongside the day grid. Month-only reporting and expense-spread fields use month/year selectors and retain their YYYY-MM values. Transfer and recurring end-date forms use the shared picker, preserving disabled series dates and recurring minimum-date validation.

### All-time reporting

Transactions and Analytics offer **All time** in their period tabs and period-selection dialogs. It includes the full account history without date bounds; transaction search, wallet, category, type and status filters are preserved. Period arrows are disabled in All time, and navigation between Transactions, Analytics and Overview retains the selection. The new-transaction date stays today. Monthly trends has its own All time option, spanning the first payment/allocation month through the last; totals remain exact and the monthly average uses the entire span, including zero months. Existing rolling/year chart ranges remain available.
