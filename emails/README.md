# CentScope emails

Active app emails use React Email with a shared layout adapted from the official
[Barebone template](https://github.com/resend/react-email/tree/canary/apps/demo/emails/01-Barebone).
No external images, fonts, social links or marketing footer are required.

- `pnpm email:dev`: preview templates at http://localhost:3001 with dummy links.
- `pnpm email:export`: export preview HTML into `out/` (never send these sample links).

`src/lib/auth/email.ts` renders each template and generates its plain-text alternative
before sending both through the existing Resend HTTP transport. It preserves the
configured verified mailbox in `AUTH_EMAIL_FROM`. Preview commands do not send email.

The templates cover email verification, password reset, and account deletion.
Keep expiry copy consistent with the server authentication configuration.
