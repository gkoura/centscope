# Archived recurring-transactions page

This private folder preserves the old `/dashboard/accounts/[id]/recurring` page
and its async content component. Next.js excludes `_` folders from routing.

The active Overview recurring section now contains **Prepare pending transactions**.
Its existing server actions remain in the sibling `recurring/actions.ts` module,
which is also used by automatic recurring sync. A folder containing only actions
exposes no page. Schedule management controls and recurrence calculations remain intact.

To restore the page later, move `page.tsx` and `_components/` back into the sibling
`recurring/` directory and deliberately restore navigation links.
