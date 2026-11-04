BEGIN;
ALTER TABLE financial_account ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE account_wallet ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
WITH ranked AS (
    SELECT id, (row_number() OVER (PARTITION BY "ownerId" ORDER BY "createdAt" DESC, id ASC) - 1)::integer AS position
    FROM financial_account
) UPDATE financial_account SET "sortOrder" = ranked.position FROM ranked WHERE financial_account.id = ranked.id;
WITH ranked AS (
    SELECT id, (row_number() OVER (PARTITION BY "financialAccountId" ORDER BY "createdAt" ASC, id ASC) - 1)::integer AS position
    FROM account_wallet
) UPDATE account_wallet SET "sortOrder" = ranked.position FROM ranked WHERE account_wallet.id = ranked.id;
ALTER TABLE financial_account ADD CONSTRAINT financial_account_sort_order_nonnegative CHECK ("sortOrder" >= 0);
ALTER TABLE account_wallet ADD CONSTRAINT account_wallet_sort_order_nonnegative CHECK ("sortOrder" >= 0);
CREATE INDEX "financial_account_ownerId_sortOrder_idx" ON financial_account ("ownerId", "sortOrder");
CREATE INDEX "account_wallet_financialAccountId_sortOrder_idx" ON account_wallet ("financialAccountId", "sortOrder");
COMMIT;
