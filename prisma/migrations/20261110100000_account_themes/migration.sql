ALTER TABLE "financial_account"
ADD COLUMN "theme" VARCHAR(16) NOT NULL DEFAULT 'forest',
ADD CONSTRAINT "financial_account_theme_check"
CHECK ("theme" IN ('forest', 'ocean', 'violet', 'rose', 'amber', 'slate'));
