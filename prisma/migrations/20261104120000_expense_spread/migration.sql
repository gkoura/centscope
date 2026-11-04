CREATE TABLE "expense_spread" (
  "transactionId" TEXT PRIMARY KEY REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "startMonth" VARCHAR(7) NOT NULL,
  "monthCount" INTEGER NOT NULL,
  CONSTRAINT "expense_spread_month_count" CHECK ("monthCount" BETWEEN 2 AND 120),
  CONSTRAINT "expense_spread_start_month" CHECK ("startMonth" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' AND left("startMonth", 4) <> '0000')
);
CREATE INDEX "expense_spread_startMonth_idx" ON "expense_spread"("startMonth");
