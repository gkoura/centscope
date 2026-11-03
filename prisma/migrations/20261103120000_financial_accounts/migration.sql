-- First approved domain slice. Other models in schema.prisma remain drafts.
BEGIN;
CREATE TABLE "financial_account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "reportingCurrency" VARCHAR(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "financial_account_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "financial_account_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 80),
    CONSTRAINT "financial_account_currency_check" CHECK ("reportingCurrency" ~ '^[A-Z]{3}$')
);
CREATE INDEX "financial_account_ownerId_idx" ON "financial_account"("ownerId");
CREATE INDEX "financial_account_createdById_idx" ON "financial_account"("createdById");
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
