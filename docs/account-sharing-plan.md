# Financial account sharing

## Goal

An owner can invite someone to one financial account. The recipient signs in with their own verified CentScope identity, accepts, and sees the account alongside their own. Access covers the selected account’s history and wallet allocations. A wallet or transfer touching another account grants no access to that account.

## Proposed first-release permissions

| Operation | Owner | Collaborator | Viewer |
| --- | --- | --- | --- |
| Read account history, balances, categories and analytics | Yes | Yes | Yes |
| Export account-scoped CSV | Yes | Yes | Yes |
| Create, edit, post/unpost and delete ordinary expenses/income | Yes | Yes | No |
| Bulk import, manage recurrence, transfers or categories | Yes | No | No |
| Manage wallets, opening balances, account settings and sharing | Yes | No | No |
| Leave shared account | N/A | Yes | Yes |

Collaborators may edit another member’s ordinary entries. Every change records the acting user. Recurring occurrences and opening balances keep their own restrictions even if a generic transaction action can reach them. Budget sharing, billing entitlements and ownership transfer are later decisions.

## Implementation sequence

1. **Establish the access boundary.** Inventory reads, server actions, workspace API resources, CSV endpoints and background work. Define reusable server checks for account read, ordinary transaction write and owner administration. Derive identity from the verified session, scope ledger reads by account allocation, and check permissions again under the account lock on writes. Keep the existing owner-only behavior until membership is ready.
2. **Activate membership and invitations.** Migrate the existing AccountRole and AccountMembership plus a small invitation table. Keep FinancialAccount.ownerId authoritative and reject owner membership. Invitations store normalized recipient email, proposed role, inviter, token hash, expiry and lifecycle state. Allow one pending invite per account/email. Reissue invalidates the earlier token. Accept by explicit authenticated POST with matching verified email, atomically consuming the invite and creating membership under the account lock. Handle expiration, revocation, repeated acceptance and concurrent role changes. Apply only the sharing migration and run db:erd and db:erd:check. Update schema notes, ERD grouping and project context.
3. **Ship read-only sharing end to end.** Add owner member management, email invitation delivery through the existing mail transport, acceptance after sign-in or registration, revocation and member self-removal. Show shared accounts in the switcher and dashboard. Preserve owned account ordering and default priority, with a stable shared fallback for a user who owns none. Keep private data inside authenticated streamed sections. Scope previews, detail, exports, recurring summaries and analytics as well as the main ledger. For a transfer involving a private account, expose only the local leg and remove inaccessible names, IDs, amounts, notes and edit links from all representations.
4. **Handle cache and deletion before enabling invitations.** The browser persists financial queries in IndexedDB and revisions currently follow the mutating session. Require fresh authorization before rendering restored shared data. Prefer keeping shared account data out of persistent storage for v1. Refresh access on focus, clear lost access across tabs, and bound staleness in an already-open tab. Recheck on every server request. Existing copies or downloaded CSVs cannot be recalled. Review user deletion with foreign authors and audit actors, owned accounts with members, outstanding invites and memberships. Default to atomic refusal with an actionable explanation whenever deleting the identity would damage another user’s records.
5. **Enable collaborator writes.** Allow ordinary expense/income mutations against active allocations of that account, retaining version checks, actual actor attribution and owner-only exceptions. Audit author-based filters so members see the same ledger. Exercise downgrade/removal racing a write. Make another member’s changes visible on refresh or focus without relying on a revision cookie set only in the writer’s browser.
6. **Verify before release.** Use an isolated database with an owner, viewer, collaborator and outsider, plus a private account linked by a transfer. Test the role matrix through direct actions/API/CSV as well as the UI. Cover email mismatch, expired/replayed invites, stale tabs after revocation, concurrent edits, member departure, user deletion and owner-only regression paths. Check the production build, public static shells, signed-out redirects and authenticated journeys. Record any unexercised flow.

## First milestone

A viewer accepts an invitation, sees the correct account in their dashboard, can read its history, and loses server access when removed. Verify that a direct URL, CSV request, transfer record or restored browser session cannot disclose the owner’s other account. Then enable collaborator writes.
