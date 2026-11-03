BEGIN;

ALTER TABLE "transaction" DROP CONSTRAINT transaction_supported_type_check;
ALTER TABLE "transaction" ADD CONSTRAINT transaction_supported_type_check
    CHECK (type IN ('OPENING_BALANCE', 'EXPENSE', 'INCOME'));
ALTER TABLE "transaction" ADD CONSTRAINT transaction_name_check
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120);

ALTER FUNCTION validate_opening_transaction(TEXT) RENAME TO validate_transaction_shape;
CREATE OR REPLACE FUNCTION validate_transaction_shape(transaction_id TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    transaction_type "TransactionType";
    entry_count INTEGER;
    entry_amount NUMERIC;
    category_id TEXT;
    category_type "CategoryType";
BEGIN
    SELECT type INTO transaction_type FROM "transaction" WHERE id = transaction_id;
    IF NOT FOUND THEN RETURN; END IF;
    SELECT count(*) INTO entry_count FROM ledger_entry WHERE "transactionId" = transaction_id;
    IF entry_count <> 1 THEN
        RAISE EXCEPTION 'This transaction requires exactly one ledger entry' USING ERRCODE = '23514';
    END IF;
    SELECT le.amount, le."categoryId", c.type INTO entry_amount, category_id, category_type
    FROM ledger_entry le LEFT JOIN category c ON c.id = le."categoryId"
    WHERE le."transactionId" = transaction_id;
    IF transaction_type = 'OPENING_BALANCE' THEN
        IF category_id IS NOT NULL THEN
            RAISE EXCEPTION 'Opening balances must be uncategorized' USING ERRCODE = '23514';
        END IF;
    ELSIF transaction_type = 'EXPENSE' THEN
        IF entry_amount >= 0 OR category_id IS NULL OR category_type IS DISTINCT FROM 'EXPENSE'::"CategoryType" THEN
            RAISE EXCEPTION 'Expenses require one negative entry and an expense category' USING ERRCODE = '23514';
        END IF;
    ELSIF transaction_type = 'INCOME' THEN
        IF entry_amount <= 0 OR category_id IS NULL OR category_type IS DISTINCT FROM 'INCOME'::"CategoryType" THEN
            RAISE EXCEPTION 'Incomes require one positive entry and an income category' USING ERRCODE = '23514';
        END IF;
    ELSE
        RAISE EXCEPTION 'Unsupported transaction type' USING ERRCODE = '23514';
    END IF;
END;
$$;

ALTER FUNCTION check_opening_transaction_shape() RENAME TO check_transaction_shape;
CREATE OR REPLACE FUNCTION check_transaction_shape() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'transaction' THEN
        PERFORM validate_transaction_shape(NEW.id);
    ELSE
        IF TG_OP <> 'INSERT' THEN PERFORM validate_transaction_shape(OLD."transactionId"); END IF;
        IF TG_OP <> 'DELETE' THEN PERFORM validate_transaction_shape(NEW."transactionId"); END IF;
    END IF;
    RETURN NULL;
END;
$$;

ALTER TRIGGER transaction_opening_shape ON "transaction" RENAME TO transaction_single_entry_shape;
ALTER TRIGGER ledger_entry_opening_shape ON ledger_entry RENAME TO ledger_entry_single_entry_shape;

COMMIT;
