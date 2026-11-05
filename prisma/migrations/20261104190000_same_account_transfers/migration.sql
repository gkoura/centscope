BEGIN;
CREATE OR REPLACE FUNCTION validate_transaction_shape(transaction_id TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE kind "TransactionType"; n INTEGER; entry_amount NUMERIC; cat TEXT; cat_type "CategoryType"; currency_count INTEGER; total NUMERIC;
BEGIN
 SELECT type INTO kind FROM "transaction" WHERE id=transaction_id;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT count(*) INTO n FROM ledger_entry WHERE "transactionId"=transaction_id;
 IF kind='TRANSFER' THEN
  IF (SELECT count(DISTINCT "financialAccountId") FROM ledger_entry WHERE "transactionId"=transaction_id)>1
  THEN RAISE EXCEPTION 'Transfers must stay within one financial account' USING ERRCODE='23514'; END IF;
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
CREATE OR REPLACE FUNCTION check_transfer_template() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE source_currency TEXT; destination_currency TEXT;
BEGIN
 IF NEW.type='TRANSFER' THEN
  IF (SELECT "financialAccountId" FROM account_wallet WHERE id=NEW."sourceId") IS DISTINCT FROM
     (SELECT "financialAccountId" FROM account_wallet WHERE id=NEW."destinationId")
  THEN RAISE EXCEPTION 'Transfer templates must stay within one financial account' USING ERRCODE='23514'; END IF;
  SELECT w.currency INTO source_currency FROM account_wallet aw JOIN wallet w ON w.id=aw."walletId" WHERE aw.id=NEW."sourceId";
  SELECT w.currency INTO destination_currency FROM account_wallet aw JOIN wallet w ON w.id=aw."walletId" WHERE aw.id=NEW."destinationId";
  IF source_currency<>destination_currency AND NEW."destinationAmount" IS NULL THEN RAISE EXCEPTION 'Cross currency templates require a received amount' USING ERRCODE='23514'; END IF;
  IF source_currency=destination_currency AND NEW."destinationAmount" IS NOT NULL AND NEW."destinationAmount"<>NEW.amount THEN RAISE EXCEPTION 'Same currency template amounts must match' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END; $$;

-- Do not silently reclassify or remove existing financial movements.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM ledger_entry le JOIN "transaction" t ON t.id=le."transactionId" WHERE t.type='TRANSFER' GROUP BY t.id HAVING count(DISTINCT le."financialAccountId")>1)
 OR EXISTS(SELECT 1 FROM recurrence_rule r JOIN account_wallet s ON s.id=r."sourceId" JOIN account_wallet d ON d.id=r."destinationId" WHERE r.type='TRANSFER' AND s."financialAccountId"<>d."financialAccountId")
 THEN RAISE EXCEPTION 'Existing cross-account transfers require manual cleanup before this migration'; END IF;
END $$;
COMMIT;
