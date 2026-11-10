BEGIN;
ALTER TABLE "recurring_budget" ADD COLUMN "allCategories" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "recurring_budget" ADD COLUMN "includeUncategorized" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "recurring_budget_id_financialAccountId_key" ON "recurring_budget"("id", "financialAccountId");
CREATE TABLE "recurring_budget_category" (
    "budgetId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "includeChildren" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "recurring_budget_category_pkey" PRIMARY KEY ("budgetId", "categoryId"),
    CONSTRAINT "recurring_budget_category_budget_fk" FOREIGN KEY ("budgetId", "financialAccountId") REFERENCES "recurring_budget"("id", "financialAccountId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recurring_budget_category_category_fk" FOREIGN KEY ("categoryId", "financialAccountId") REFERENCES "category"("id", "financialAccountId") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "recurring_budget_category_categoryId_financialAccountId_idx" ON "recurring_budget_category"("categoryId", "financialAccountId");
-- Preserve old root-as-subtree and subcategory-as-exact matching, including archived selections.
INSERT INTO "recurring_budget_category" ("budgetId", "financialAccountId", "categoryId", "includeChildren")
SELECT b."id", b."financialAccountId", b."categoryId", c."parentId" IS NULL
FROM "recurring_budget" b JOIN "category" c ON c."id" = b."categoryId" AND c."financialAccountId" = b."financialAccountId";
UPDATE "recurring_budget" SET "allCategories" = false WHERE "categoryId" IS NOT NULL;
DROP INDEX IF EXISTS "recurring_budget_categoryId_financialAccountId_idx";
ALTER TABLE "recurring_budget" DROP COLUMN "categoryId";
ALTER TABLE "recurring_budget" ADD CONSTRAINT "recurring_budget_all_categories_check" CHECK (NOT ("allCategories" AND "includeUncategorized"));
COMMIT;
