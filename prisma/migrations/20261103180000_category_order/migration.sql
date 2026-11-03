BEGIN;
ALTER TABLE category ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
WITH ranked AS (
    SELECT id, (row_number() OVER (
        PARTITION BY "financialAccountId", type, "parentId"
        ORDER BY name ASC, id ASC
    ) - 1)::integer AS position
    FROM category
)
UPDATE category SET "sortOrder" = ranked.position FROM ranked WHERE category.id = ranked.id;
ALTER TABLE category ADD CONSTRAINT category_sort_order_nonnegative CHECK ("sortOrder" >= 0);
CREATE INDEX "category_financialAccountId_type_parentId_sortOrder_idx"
    ON category ("financialAccountId", type, "parentId", "sortOrder");
COMMIT;
