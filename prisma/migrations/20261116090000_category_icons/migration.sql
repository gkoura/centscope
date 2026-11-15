-- Additive, nullable, no data rewrite: existing categories retain the Tag fallback.
-- Stable keys are allowlisted by category-input and the category write service.
-- Deliberately no database enum: unknown historical/future keys render safely.
ALTER TABLE "category" ADD COLUMN "iconKey" TEXT;
