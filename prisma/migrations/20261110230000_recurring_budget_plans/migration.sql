-- Preserve every budget ID/scope/limit and convert existing rows to monthly plans.
-- Retry-safe after a failed attempt, including one that persisted partial DDL.
BEGIN;
DO $$
BEGIN
    IF to_regclass('public.monthly_budget') IS NOT NULL THEN
        IF to_regclass('public.recurring_budget') IS NOT NULL THEN
            RAISE EXCEPTION 'Both budget tables exist; inspect them before continuing';
        END IF;
        ALTER TABLE public.monthly_budget RENAME TO recurring_budget;
    ELSIF to_regclass('public.recurring_budget') IS NULL THEN
        RAISE EXCEPTION 'Neither budget table exists; apply the monthly budget migration first';
    END IF;
END $$;

ALTER TABLE public.recurring_budget ADD COLUMN IF NOT EXISTS "recurrence" "RecurrenceFrequency" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE public.recurring_budget DROP CONSTRAINT IF EXISTS "monthly_budget_month_check";
-- Drop this first: DROP COLUMN also removes indexes referencing the column.
DROP INDEX IF EXISTS public."monthly_budget_financialAccountId_month_idx";
ALTER TABLE public.recurring_budget DROP COLUMN IF EXISTS "month";
CREATE INDEX IF NOT EXISTS "recurring_budget_financialAccountId_recurrence_idx" ON public.recurring_budget("financialAccountId", "recurrence");
DROP INDEX IF EXISTS public."monthly_budget_categoryId_financialAccountId_idx";
CREATE INDEX IF NOT EXISTS "recurring_budget_categoryId_financialAccountId_idx" ON public.recurring_budget("categoryId", "financialAccountId");

-- Rename only constraints that retain their old names after a previous attempt.
DO $$
DECLARE
    old_name TEXT;
    new_name TEXT;
BEGIN
    FOR old_name, new_name IN
        SELECT * FROM (VALUES
            ('monthly_budget_pkey', 'recurring_budget_pkey'),
            ('monthly_budget_account_fk', 'recurring_budget_account_fk'),
            ('monthly_budget_category_fk', 'recurring_budget_category_fk'),
            ('monthly_budget_name_check', 'recurring_budget_name_check'),
            ('monthly_budget_currency_check', 'recurring_budget_currency_check'),
            ('monthly_budget_limit_check', 'recurring_budget_limit_check'),
            ('monthly_budget_version_check', 'recurring_budget_version_check')
        ) AS names(old_name, new_name)
    LOOP
        IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'public.recurring_budget'::regclass
              AND conname = old_name
        ) THEN
            EXECUTE format('ALTER TABLE public.recurring_budget RENAME CONSTRAINT %I TO %I', old_name, new_name);
        END IF;
    END LOOP;
END $$;
COMMIT;
