-- Only the approved wallet/opening-balance slice is activated here.
BEGIN;

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('BANK', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'POSTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER', 'OPENING_BALANCE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('EXPENSE', 'INCOME');

-- CreateTable
CREATE TABLE "wallet" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WalletType" NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_wallet" (
    "id" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "parentId" TEXT,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "accountWalletId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "amount" DECIMAL(24,8) NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_change" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "liveTransactionId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_change_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_ownerId_idx" ON "wallet"("ownerId");

-- CreateIndex
CREATE INDEX "account_wallet_walletId_idx" ON "account_wallet"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "account_wallet_id_financialAccountId_key" ON "account_wallet"("id", "financialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "account_wallet_financialAccountId_walletId_key" ON "account_wallet"("financialAccountId", "walletId");

-- CreateIndex
CREATE INDEX "category_financialAccountId_type_idx" ON "category"("financialAccountId", "type");

-- CreateIndex
CREATE INDEX "category_parentId_financialAccountId_idx" ON "category"("parentId", "financialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "category_id_financialAccountId_key" ON "category"("id", "financialAccountId");

-- CreateIndex
CREATE INDEX "transaction_status_occurredAt_idx" ON "transaction"("status", "occurredAt");

-- CreateIndex
CREATE INDEX "transaction_createdById_occurredAt_idx" ON "transaction"("createdById", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_createdById_idempotencyKey_key" ON "transaction"("createdById", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ledger_entry_accountWalletId_idx" ON "ledger_entry"("accountWalletId");

-- CreateIndex
CREATE INDEX "ledger_entry_categoryId_financialAccountId_idx" ON "ledger_entry"("categoryId", "financialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entry_transactionId_accountWalletId_key" ON "ledger_entry"("transactionId", "accountWalletId");

-- CreateIndex
CREATE INDEX "transaction_change_transactionId_createdAt_idx" ON "transaction_change"("transactionId", "createdAt");

-- CreateIndex
CREATE INDEX "transaction_change_liveTransactionId_idx" ON "transaction_change"("liveTransactionId");

-- CreateIndex
CREATE INDEX "transaction_change_actorId_idx" ON "transaction_change"("actorId");

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_wallet" ADD CONSTRAINT "account_wallet_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "financial_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_wallet" ADD CONSTRAINT "account_wallet_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "financial_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_financialAccountId_fkey" FOREIGN KEY ("parentId", "financialAccountId") REFERENCES "category"("id", "financialAccountId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_accountWalletId_financialAccountId_fkey" FOREIGN KEY ("accountWalletId", "financialAccountId") REFERENCES "account_wallet"("id", "financialAccountId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_categoryId_financialAccountId_fkey" FOREIGN KEY ("categoryId", "financialAccountId") REFERENCES "category"("id", "financialAccountId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction_change" ADD CONSTRAINT "transaction_change_liveTransactionId_fkey" FOREIGN KEY ("liveTransactionId") REFERENCES "transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_change" ADD CONSTRAINT "transaction_change_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business constraints not expressible in Prisma; see SCHEMA_NOTES.md.
ALTER TABLE "wallet"
    ADD CONSTRAINT "wallet_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 80),
    ADD CONSTRAINT "wallet_currency_check" CHECK ("currency" IN ('EUR', 'GBP', 'USD'));
ALTER TABLE "transaction"
    ADD CONSTRAINT "transaction_supported_type_check" CHECK ("type" = 'OPENING_BALANCE'),
    ADD CONSTRAINT "transaction_version_check" CHECK ("version" > 0);
ALTER TABLE "ledger_entry"
    ADD CONSTRAINT "ledger_entry_amount_check" CHECK (
        "amount" <> 0 AND "amount" = round("amount", 2)
        AND "amount" NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
    );

-- Validate final transaction shape at commit, after the nested entry is inserted.
-- Extend this validator and supported_type_check before enabling other types.
CREATE FUNCTION validate_opening_transaction(transaction_id TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    entry_count INTEGER;
    categorized_count INTEGER;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "transaction" WHERE id = transaction_id) THEN
        RETURN;
    END IF;
    SELECT count(*), count("categoryId") INTO entry_count, categorized_count
    FROM ledger_entry WHERE "transactionId" = transaction_id;
    IF entry_count <> 1 OR categorized_count <> 0 THEN
        RAISE EXCEPTION 'An opening balance requires exactly one uncategorized ledger entry'
            USING ERRCODE = '23514';
    END IF;
END;
$$;

CREATE FUNCTION check_opening_transaction_shape() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'transaction' THEN
        PERFORM validate_opening_transaction(NEW.id);
    ELSE
        IF TG_OP <> 'INSERT' THEN
            PERFORM validate_opening_transaction(OLD."transactionId");
        END IF;
        IF TG_OP <> 'DELETE' THEN
            PERFORM validate_opening_transaction(NEW."transactionId");
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER transaction_opening_shape
AFTER INSERT OR UPDATE ON "transaction" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_opening_transaction_shape();

CREATE CONSTRAINT TRIGGER ledger_entry_opening_shape
AFTER INSERT OR UPDATE OR DELETE ON ledger_entry DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_opening_transaction_shape();

CREATE FUNCTION protect_wallet_history() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.currency IS DISTINCT FROM OLD.currency AND EXISTS (
        SELECT 1 FROM account_wallet aw JOIN ledger_entry le ON le."accountWalletId" = aw.id
        WHERE aw."walletId" = OLD.id
    ) THEN
        RAISE EXCEPTION 'A wallet currency cannot change after financial history exists'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER wallet_currency_history
BEFORE UPDATE OF currency ON wallet
FOR EACH ROW EXECUTE FUNCTION protect_wallet_history();

CREATE FUNCTION protect_allocation_history() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF (NEW."walletId" IS DISTINCT FROM OLD."walletId"
        OR NEW."financialAccountId" IS DISTINCT FROM OLD."financialAccountId")
        AND EXISTS (SELECT 1 FROM ledger_entry WHERE "accountWalletId" = OLD.id) THEN
        RAISE EXCEPTION 'An allocation with financial history cannot be reassigned'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER account_wallet_history
BEFORE UPDATE OF "walletId", "financialAccountId" ON account_wallet
FOR EACH ROW EXECUTE FUNCTION protect_allocation_history();

COMMIT;
