-- Activate account-scoped monthly limits only; independent Budget* drafts stay deferred.
CREATE TABLE "monthly_budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "financialAccountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" VARCHAR(80) NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "spendingLimit" DECIMAL(24,8) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "monthly_budget_account_fk" FOREIGN KEY ("financialAccountId") REFERENCES "financial_account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "monthly_budget_category_fk" FOREIGN KEY ("categoryId", "financialAccountId") REFERENCES "category"("id", "financialAccountId") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "monthly_budget_name_check" CHECK (length(btrim("name")) BETWEEN 1 AND 80),
    CONSTRAINT "monthly_budget_month_check" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND "month" >= '1900-01' AND "month" <= '9998-12'),
    CONSTRAINT "monthly_budget_currency_check" CHECK ("currency" IN ('EUR', 'GBP', 'USD')),
    CONSTRAINT "monthly_budget_limit_check" CHECK ("spendingLimit" > 0 AND "spendingLimit" < 1000000000000 AND "spendingLimit" = round("spendingLimit", 2)),
    CONSTRAINT "monthly_budget_version_check" CHECK ("version" > 0)
);
CREATE INDEX "monthly_budget_financialAccountId_month_idx" ON "monthly_budget"("financialAccountId", "month");
CREATE INDEX "monthly_budget_categoryId_financialAccountId_idx" ON "monthly_budget"("categoryId", "financialAccountId");
