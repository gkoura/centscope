BEGIN;

ALTER TABLE category ADD CONSTRAINT category_name_check
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 80);

-- Sibling names are unique within a type, ignoring case and surrounding spaces.
CREATE UNIQUE INDEX category_active_sibling_name_key
ON category ("financialAccountId", type, COALESCE("parentId", ''), lower(btrim(name)))
WHERE "archivedAt" IS NULL;

CREATE FUNCTION check_category_hierarchy() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    parent_category category%ROWTYPE;
BEGIN
    IF TG_OP = 'UPDATE' AND (
        NEW.type IS DISTINCT FROM OLD.type OR NEW."parentId" IS DISTINCT FROM OLD."parentId"
        OR NEW."financialAccountId" IS DISTINCT FROM OLD."financialAccountId"
    ) THEN
        RAISE EXCEPTION 'Category type and position cannot change' USING ERRCODE = '23514';
    END IF;
    IF NEW."parentId" IS NOT NULL THEN
        SELECT * INTO parent_category FROM category
        WHERE id = NEW."parentId" AND "financialAccountId" = NEW."financialAccountId"
        FOR UPDATE;
        IF NOT FOUND OR NEW."parentId" = NEW.id OR parent_category."parentId" IS NOT NULL
            OR parent_category.type <> NEW.type
            OR (NEW."archivedAt" IS NULL AND parent_category."archivedAt" IS NOT NULL) THEN
            RAISE EXCEPTION 'Subcategories require an active root of the same account and type'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    IF NEW."archivedAt" IS NOT NULL AND EXISTS (
        SELECT 1 FROM category WHERE "parentId" = NEW.id AND "archivedAt" IS NULL
    ) THEN
        RAISE EXCEPTION 'Archive subcategories before archiving their parent' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER category_hierarchy
BEFORE INSERT OR UPDATE ON category
FOR EACH ROW EXECUTE FUNCTION check_category_hierarchy();

-- One-time backfill for existing active accounts; no default subcategories.
-- Existing active custom categories with the same sibling name are retained.
INSERT INTO category (id, "financialAccountId", name, type, "updatedAt")
SELECT 'default_' || md5(fa.id || ':' || defaults.type || ':' || defaults.name),
       fa.id, defaults.name, defaults.type::"CategoryType", CURRENT_TIMESTAMP
FROM financial_account fa CROSS JOIN (VALUES
    ('Food & drink', 'EXPENSE'), ('Home & bills', 'EXPENSE'),
    ('Transport', 'EXPENSE'), ('Shopping', 'EXPENSE'), ('Health', 'EXPENSE'),
    ('Leisure', 'EXPENSE'), ('Other expenses', 'EXPENSE'),
    ('Salary', 'INCOME'), ('Other income', 'INCOME')
) AS defaults(name, type)
WHERE fa."archivedAt" IS NULL
ON CONFLICT DO NOTHING;

COMMIT;
