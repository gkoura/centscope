BEGIN;
ALTER TABLE "transaction" DROP CONSTRAINT transaction_supported_type_check;
ALTER TABLE "transaction" ADD CONSTRAINT transaction_supported_type_check CHECK (type IN ('OPENING_BALANCE','EXPENSE','INCOME','TRANSFER'));
CREATE OR REPLACE FUNCTION validate_transaction_shape(transaction_id TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE kind "TransactionType"; n INTEGER; entry_amount NUMERIC; cat TEXT; cat_type "CategoryType"; currency_count INTEGER; total NUMERIC;
BEGIN
 SELECT type INTO kind FROM "transaction" WHERE id=transaction_id;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT count(*) INTO n FROM ledger_entry WHERE "transactionId"=transaction_id;
 IF kind='TRANSFER' THEN
  IF n<>2 OR (SELECT count(*) FROM ledger_entry WHERE "transactionId"=transaction_id AND amount<0)<>1
   OR (SELECT count(*) FROM ledger_entry WHERE "transactionId"=transaction_id AND amount>0)<>1
   OR EXISTS(SELECT 1 FROM ledger_entry WHERE "transactionId"=transaction_id AND "categoryId" IS NOT NULL)
  THEN RAISE EXCEPTION 'Transfers require two uncategorized opposite signed entries' USING ERRCODE='23514'; END IF;
  SELECT count(DISTINCT w.currency),sum(le.amount) INTO currency_count,total FROM ledger_entry le JOIN account_wallet aw ON aw.id=le."accountWalletId" JOIN wallet w ON w.id=aw."walletId" WHERE le."transactionId"=transaction_id;
  IF currency_count=1 AND total<>0 THEN RAISE EXCEPTION 'Same currency transfer amounts must cancel exactly' USING ERRCODE='23514'; END IF;
 ELSE
  IF n<>1 THEN RAISE EXCEPTION 'This transaction requires exactly one ledger entry' USING ERRCODE='23514'; END IF;
  SELECT le.amount,le."categoryId",c.type INTO entry_amount,cat,cat_type FROM ledger_entry le LEFT JOIN category c ON c.id=le."categoryId" WHERE le."transactionId"=transaction_id;
  IF kind='OPENING_BALANCE' THEN
   IF cat IS NOT NULL THEN RAISE EXCEPTION 'Opening balances must be uncategorized' USING ERRCODE='23514'; END IF;
  ELSIF kind='EXPENSE' THEN
   IF entry_amount>=0 OR cat IS NULL OR cat_type IS DISTINCT FROM 'EXPENSE'::"CategoryType" THEN RAISE EXCEPTION 'Expenses require a negative entry and expense category' USING ERRCODE='23514'; END IF;
  ELSIF kind='INCOME' THEN
   IF entry_amount<=0 OR cat IS NULL OR cat_type IS DISTINCT FROM 'INCOME'::"CategoryType" THEN RAISE EXCEPTION 'Incomes require a positive entry and income category' USING ERRCODE='23514'; END IF;
  ELSE RAISE EXCEPTION 'Unsupported transaction type' USING ERRCODE='23514'; END IF;
 END IF;
END; $$;
ALTER TABLE recurrence_rule DROP CONSTRAINT recurrence_rule_type_check;
ALTER TABLE recurrence_rule ADD CONSTRAINT recurrence_rule_type_check CHECK (type IN ('EXPENSE','INCOME','TRANSFER'));
ALTER TABLE recurrence_rule DROP CONSTRAINT recurrence_supported_template;
ALTER TABLE recurrence_rule ADD CONSTRAINT recurrence_supported_template CHECK (
 (type IN ('EXPENSE','INCOME') AND "destinationId" IS NULL AND "destinationAmount" IS NULL AND "categoryId" IS NOT NULL)
 OR (type='TRANSFER' AND "destinationId" IS NOT NULL AND "destinationId"<>"sourceId" AND "categoryId" IS NULL AND "spreadMonthCount" IS NULL)
);
ALTER TABLE recurrence_rule ADD CONSTRAINT recurrence_destination_amount CHECK ("destinationAmount" IS NULL OR ("destinationAmount">0 AND "destinationAmount"=round("destinationAmount",2)));
CREATE FUNCTION check_transfer_template() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE source_currency TEXT; destination_currency TEXT;
BEGIN
 IF NEW.type='TRANSFER' THEN
  SELECT w.currency INTO source_currency FROM account_wallet aw JOIN wallet w ON w.id=aw."walletId" WHERE aw.id=NEW."sourceId";
  SELECT w.currency INTO destination_currency FROM account_wallet aw JOIN wallet w ON w.id=aw."walletId" WHERE aw.id=NEW."destinationId";
  IF source_currency<>destination_currency AND NEW."destinationAmount" IS NULL THEN RAISE EXCEPTION 'Cross currency templates require a received amount' USING ERRCODE='23514'; END IF;
  IF source_currency=destination_currency AND NEW."destinationAmount" IS NOT NULL AND NEW."destinationAmount"<>NEW.amount THEN RAISE EXCEPTION 'Same currency template amounts must match' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER recurrence_transfer_shape BEFORE INSERT OR UPDATE ON recurrence_rule FOR EACH ROW EXECUTE FUNCTION check_transfer_template();
COMMIT;
