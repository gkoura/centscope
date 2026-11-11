BEGIN;
ALTER TABLE "financial_account" ADD COLUMN "budgetCadenceOrder" TEXT[] NOT NULL DEFAULT ARRAY['DAILY','WEEKLY','MONTHLY','YEARLY']::TEXT[];
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_budget_cadence_order_check" CHECK (cardinality("budgetCadenceOrder") = 4 AND "budgetCadenceOrder" @> ARRAY['DAILY','WEEKLY','MONTHLY','YEARLY']::TEXT[]);
ALTER TABLE "recurring_budget" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
WITH ranked AS (SELECT "id", row_number() OVER (PARTITION BY "financialAccountId", "recurrence" ORDER BY "createdAt", "id") - 1 AS position FROM "recurring_budget") UPDATE "recurring_budget" b SET "sortOrder" = ranked.position FROM ranked WHERE b."id" = ranked."id";
DROP INDEX IF EXISTS "recurring_budget_financialAccountId_recurrence_idx";
CREATE INDEX "recurring_budget_financialAccountId_recurrence_sortOrder_idx" ON "recurring_budget"("financialAccountId", "recurrence", "sortOrder");
ALTER TABLE "recurring_budget" ADD CONSTRAINT "recurring_budget_sort_order_check" CHECK ("sortOrder" >= 0);
COMMIT;
