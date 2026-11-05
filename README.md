# Next.js template

This is a Next.js template with shadcn/ui.

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

### Recurring transactions

Enable **Repeat** on an expense or income, or edit an existing transaction to start a series. Future copies are created **upfront as Pending**; they never post automatically. The original transaction keeps the date/status you select. Mark each Pending payment Posted when it happens. Dates alone do not affect balances.

Schedules with an end date or occurrence count prepare every scheduled copy (up to 10,000 slots). Open-ended schedules maintain a rolling 12-month window, starting from the first date if it is in the future. Opening the account, transaction list, analysis, or recurring page replenishes that window. No cron job, secret, or background scheduler is needed.

Creation is incremental and retry-safe. The first batch is saved with the original transaction; the page automatically prepares the remaining copies and shows progress. Closing the page stops further requests; reopening or choosing **Prepare pending transactions** resumes from the saved cursor. Skipped/deleted copies are never recreated.

The editor supports **Only this occurrence**, **This and future occurrences**, and **All occurrences (including past)**. Series edits preserve existing dates, overwrite shared details, and require confirmation because amounts, wallets and Posted/Pending status can change balances. Cadence changes apply only to dates that have not been prepared yet; edit an individual occurrence to change its saved date. Stopping or pausing holds further creation and leaves existing transactions intact. **Skip next** removes the next saved Pending copy, with an audit and retained exclusion slot.


### Wallet transfers

Use **Transfer** in transaction history or on a wallet card. Choose source and destination wallets within the current account. Same-currency transfers use one amount; cross-currency transfers require the exact amount sent and received. Fees are separate expenses. Transfers affect wallet balances, not income or spending, and appear once in history with both endpoints.

Pending FX transfers ask you to confirm actual amounts before posting. Posting/unposting affects both wallets together; dates never change status. Edit preserves each leg’s currency. Repeat prepares future two-sided Pending copies using the existing fixed ending or rolling 12-month window, with Only / This and future / All scopes. Deletion previews both wallet effects, and deleting a wallet removes whole linked transfers while keeping unrelated transactions in the other wallets.

Transfers are limited to wallets in the same financial account. Record money sent from Personal to Home as a categorized expense in Personal and income in Home; these are separate transactions.
