# CentScope naming rebrand — 2026-11-06

CentScope is a personal finance tracking app: “cent” plus “scope”, a clear view of your money. Display name: **CentScope**. Lowercase identifier: `centscope`. Tagline: **Make sense of every cent.**

The rebrand changes public text, wordmarks, metadata/application name, auth app name and email copy, sender display names, CSV sample filename, package name and documentation. It preserves colors, typography, icons, route structure, financial behavior, server authorization, Suspense boundaries, Cache Components and Partial Prefetching. There is no existing web manifest or separately branded raster asset to rename; the existing chart icon is unchanged.

## Intentional legacy identifiers

| Identifier | Reason retained |
| --- | --- |
| `fintrack-workspace` | IndexedDB name; existing persisted user caches must remain accessible. |
| `fintrack-workspace-revision` | Revision cookie shared by reads, writes and browser cache invalidation. |
| `fintrack:workspace-cache` | Cross-component/cache event protocol, including already open tabs. |
| `X-Fintrack-User`, `X-Fintrack-Revision` | Workspace request headers and server `Vary`/validation contract; the existing header test remains correct. |
| `fintrack:transaction-import:v1:` | Import fingerprint namespace; changing it would defeat exact-file retry/deletion protection. |
| `FINTRACK_BUILD_DIR` | Existing build environment configuration and historical context entry. |
| `https://fintrack.invalid` | Internal URL-parser sentinel, never a network destination or public address. |
| Existing environment URLs/addresses and repository directory | Working origins, sender mailboxes and infrastructure are not renamed for branding. |

Better Auth keeps its default `better-auth` cookie prefix, independently of `appName`. Auth UI session-storage keys and theme preferences stay unchanged. Database models/tables/migrations, OAuth client IDs, credentials, external services and deployment project names are untouched. No migration is needed. Email transport uses the configured `AUTH_EMAIL_FROM` mailbox with a CentScope display name, whether the existing value contains a display name or only a mailbox.

## External setup to review separately

- Google Cloud / Google Auth Platform: update the OAuth consent screen's public application name to CentScope if it still uses the old name. Keep the existing OAuth application, client IDs, origins and redirect URLs.
- Review any provider-hosted email defaults/templates or public service labels outside this repository. Application-sent verification/reset emails already set their own CentScope copy and sender display name. Keep verified sending domains and addresses.
- Keep current deployment projects and domains. No replacement CentScope domain or email address is assumed.

No external service configuration or deployment was changed. Actual Google consent/callback/linking, inbox delivery, password reset completion and authenticated financial screens were not exercised during this rebrand.

## Verification

- All 89 existing unit tests pass; TypeScript and changed-source ESLint pass. Six mocked verification/reset emails cover legacy/new/bare sender configurations, unchanged mailboxes and unchanged token URLs; no email was sent.
- Full `pnpm lint` fails on generated alternative build directories and existing source issues. Source-only lint reports the previously documented 18 errors and 13 warnings in auth components.
- Production build passes using `FINTRACK_BUILD_DIR=.next-rebrand pnpm run build --webpack`. Default Turbopack attempts fail because its CSS worker cannot bind a local port in this environment. Existing font downloads required network access. Next diagnostics report no compilation or runtime issues in the running development app.
- Inspected actual emitted HTML for accounts, Overview, Transactions and security: CentScope titles/wordmarks, public headings, meaningful loading sections and no private financial content. Partial prerendering and Partial Prefetching remain enabled.
- Browser checked landing, sign-in, sign-up and forgot-password pages, browser title/application metadata, and signed-out security redirect. Desktop (1440px) and mobile (320px/390px) wordmarks fit. The 320px landing page has 9px of pre-existing overflow outside the wordmark; substituting the original heading/brand produces the same 329px scroll width. At 390px the page has no horizontal overflow. Physical devices were not tested.
- Authenticated verification was blocked by automatic approval review: proposed disposable user/session/empty-account creation was rejected because the configured database environment and blast radius were not verified. No fixture was created. Approval is needed before performing that database-backed check.
