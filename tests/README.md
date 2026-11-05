# Testing

## Layout and coverage

`unit/` contains the existing tests for pure finance logic, using Node's built-in
`node:test` runner and `node:assert/strict`. Tests import TypeScript source directly
using Node's type stripping; no additional test framework is required.

| File | Scope |
| --- | --- |
| `wallet-input.test.mjs` | Wallet validation, exact money parsing and formatting |
| `category-input.test.mjs` | Category defaults, validation, selection and ordering |
| `transaction-input.test.mjs` | Transaction input, status and edit validation |
| `transaction-import.test.mjs` | CSV parsing, import preview and transaction filters |
| `transaction-import-batch.test.mjs` | Import plans, signed batches, retries and progress |
| `account-period.test.mjs` | Calendar periods, month navigation, entry defaults and safe return links |
| `wallet-filter.test.mjs` | Composite wallet URL values, limits and independent toggles |
| `smoothed-balance.test.mjs` | Exact cumulative expense allocation, historic balances, transfers and currency isolation |
| `account-summary.test.mjs` | Exact currency totals, pending isolation, wallet flows and transfer counting |
| `list-order.test.mjs` | Complete ID permutations and saved-order comparison |

These are unit tests. They do not establish browser, authentication, authorization,
database, or end-to-end coverage. Historical manual and disposable integration
checks in project notes are not a maintained automated suite.

## Commands (run only when requested)

Use the project's supported Node version with `--experimental-strip-types` support
and built-in `FormData`.

```sh
pnpm test          # All unit tests
pnpm test:unit     # All unit tests
pnpm test:finance  # Existing alias for all finance unit tests
pnpm test:wallet   # Wallet input tests only
```

## Conventions

- Add pure logic tests as `tests/unit/<module>.test.mjs`; the unit command includes
  every matching file automatically.
- Import application code from `../../src/lib/`, including dynamic imports.
- Keep test data deterministic and local. Unit tests should not require secrets,
  a running app, external services, or a database.
- If integration or browser suites are introduced, give them separate directories
  and explicit commands so unit tests stay isolated.

This organization change did not execute any tests.

## Browser cache regression checks

`tests/unit/workspace-cache.test.mjs` exercises privacy partitioning, canonical period/filter keys, expiry, persistence limits, hydration precedence and background-refresh failures. It runs in the regular unit suite. See `docs/CACHING.md` for the browser data flow and the authenticated manual regression scenarios, including blocked-network reload, mutation freshness, draft preservation, user isolation and logout cleanup. Use disposable users/records for browser write checks.

`tests/unit/request-session.test.mjs` verifies that the Route Handler session context stays isolated across concurrent requests and is absent after failures.
