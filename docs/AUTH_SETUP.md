# Authentication: first slice

Email/password registration, email verification, sign-in, sign-out, password recovery,
and a server-protected dashboard are implemented. Google/linking
and optional 2FA are the next separate steps.

## Local configuration

Keep these values in `.env.local`, never in source control:

```dotenv
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<a cryptographically random secret of at least 32 characters>
DATABASE_URL_POOLED=<existing PostgreSQL pooled connection string>
DATABASE_URL_UNPOOLED=<existing PostgreSQL direct connection string>
RESEND_API_KEY=<your Resend sending API key>
AUTH_EMAIL_FROM=CentScope <auth@your-verified-domain.example>
```

The application uses CentScope as the sender display name while preserving the
mailbox configured in `AUTH_EMAIL_FROM`, including existing configurations with
an older display name. Do not change a working sender address for the rebrand.

Use a sender on a domain verified in Resend. For initial development, Resend's
`onboarding@resend.dev` test sender can send only to the Resend account owner's
email. Set the same variables for each deployment environment, using its actual
HTTPS origin and a production sender. Restart the dev server after changing env.

The existing auth migration creates `user`, `account`, `session`, and
`verification`; this slice adds no database models or migrations. Do not push the
entire draft domain schema just to enable authentication.

## Try the flow

1. Run `pnpm dev`, then open `/auth/sign-up`.
2. Register with your own email and a password of 15–128 characters. Password
   managers, paste, and passphrases are supported; no composition rules apply.
3. The UI opens `/auth/verify-email`. No authenticated session is issued yet.
4. Open the emailed verification link within one hour. Verification does not
   automatically sign you in; sign in with your password afterward.
5. `/dashboard` shows your name and email. Its server guard checks both the
   session and email verification before rendering user content.
6. Click **Sign out**. The server session is revoked, client query data is
   cleared, and navigating directly to `/dashboard` requires sign-in again.

Invalid verification links use Better Auth's error handling. A resend control
is available on the verification screen after its cooldown. Unverified password
sign-in also triggers another verification email.

Email sending runs through Better Auth's background-task handler using Next.js
`after`, so it survives the response lifecycle on supported deployments.
Delivery/configuration failures appear in server logs; a successful registration
response alone does not prove email delivery. Verification URLs, recipient
addresses, and provider response bodies are not logged by the sender.

## Boundaries before production

- Better Auth's origin/CSRF checks, password hashing, session cookies, and
  production rate limiting retain their secure defaults. Distributed rate-limit
  storage remains a required production hardening step: the default in-memory
  counter is not shared across Vercel instances.
- Cookie session caching is not enabled; protected pages consult Better Auth's
  server session API. Future actions and API endpoints must enforce their own
  session and resource permissions at their data access boundary.
- Password recovery is available from the sign-in screen. Reset links expire after 30 minutes, are single-use, and revoke all existing sessions after a successful reset. Users sign in again using the new password. Unknown emails receive the same generic success response.
- The copied organization/admin/OAuth-provider components do not enable any
  server plugins. Financial-account and budget roles remain separate server-side
  authorization work.

References: [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next),
[Better Auth UI Next.js integration](https://better-auth-ui.com/docs/shadcn/integrations/nextjs),
[Resend sending API](https://resend.com/docs/api-reference/emails/send-email).

## Google sign-in and linking

Create a **Web application** OAuth client in Google Cloud's Google Auth Platform.
Configure the consent screen/audience; when in testing, add your Google account
as a test user. Set the authorized redirect URI exactly to:

```text
http://localhost:3000/api/auth/callback/google
```

Add the credentials to `.env.local` and restart the dev server:

```dotenv
GOOGLE_CLIENT_ID=<web client ID>
GOOGLE_CLIENT_SECRET=<web client secret>
```

Both values are required before Google buttons appear. Never expose the client
secret through a NEXT_PUBLIC variable. For production, add the actual HTTPS
callback URI and configure the consent audience appropriately.

Test Google from sign-in or sign-up. An existing verified CentScope user with a
matching verified Google email should keep the same identity and financial data.
An unverified local registration must verify its email before automatic linking.
From the dashboard, **Manage sign-in methods** opens `/settings/security` for
explicit linking/unlinking. This first version requires matching emails for
explicit linking too. The final sign-in method cannot be removed. Google-only
users can use password recovery to add a password.

OAuth tokens are encrypted at rest. No additional Google API scopes are requested.
Google consent/callback and account linking must still be verified with real
OAuth credentials; compilation checks do not verify the external flow.

## Account deletion

Settings → Account settings → Danger zone offers permanent account deletion.
The confirmation dialog requests an email; it does not delete data immediately.
The single-use link expires after 30 minutes and requires a session for the same
user. This supports both Google-only and password accounts. Configure
`BETTER_AUTH_URL` to the deployed HTTPS origin and the existing Resend sender.

After Better Auth validates the token, `deleteAccountData` removes recurring
occurrences/rules, transactions (including ledger/spread rows), the user's audit
snapshots, wallet allocations, child/root categories, financial accounts, wallets,
verification records, and the user in one Serializable transaction. Deleting the
user cascades to provider accounts and sessions. Better Auth then clears the
session cookie. A foreign financial reference fails the deletion and rolls the
whole cleanup back; no sharing/ownership transfer is implemented. The current
budget and membership models are unshipped drafts and are not queried here.
No schema changes or migrations are required.

Audit retention during ordinary transaction deletion is unchanged. Full identity
erasure intentionally removes that user's audit snapshots as well.

## Settings: profile, passwords and sessions

`/settings/security` groups profile and read-only verified email under Account,
with password management, Google linking, and active sessions under Security.
Each server-rendered private section authenticates beneath its own Suspense
boundary; the public headings remain prerendered. Account deletion stays at the
bottom in its danger zone.

Profile changes save explicitly and preserve unsaved edits during session
refresh. Password accounts require the current password, enforce the existing
15–128-character policy, and revoke other sessions after a successful change.
Google-only users receive a reset link to set a password; the last sign-in method
cannot be unlinked. Session rows show browser/OS, the current device, sign-in time,
and session refresh time (not precise last activity). Other sessions can be
revoked individually or together; signing out everywhere clears the browser's
workspace cache before navigating to sign-in. Email changes, avatars, passkeys,
and two-factor setup are outside this first settings slice. No migration needed.
