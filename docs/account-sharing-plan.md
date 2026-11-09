# Financial account sharing

An invitation grants access to one financial account. The owner invites someone by email under **Account tools → Account sharing**. Acceptance requires a verified session with the matching email. Invitations expire after seven days, and resending rotates the token.

## Account experience

Owners and members open the same Overview, Transactions, Analytics, wallets, categories, transfers, recurring schedules, imports and exports. The switcher preserves the current section. An owned account has priority as the default; users with only shared accounts open their first shared account. The owner alone sees sharing controls and can invite or remove others. Members can leave from the accounts list.

Existing Viewer and Collaborator memberships have equal financial access. Actions record the signed-in user in transaction and audit history and verify membership under the account lock. A wallet allocated across multiple accounts can be deleted only by someone with access to all of them.

## Deployment

Apply the account-sharing migration before deploying the feature. Existing deployments with that migration already applied need only the application update. Shared-account query results are kept in memory and revalidated on focus and while the workspace is visible. Owned accounts retain their existing offline cache.
