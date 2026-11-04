BEGIN;
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TABLE recurrence_rule (
 id TEXT PRIMARY KEY,
 "createdById" TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 type "TransactionType" NOT NULL CHECK (type IN ('EXPENSE', 'INCOME')),
 name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
 notes TEXT,
 "sourceId" TEXT NOT NULL REFERENCES account_wallet(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "destinationId" TEXT REFERENCES account_wallet(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 amount DECIMAL(24,8) NOT NULL CHECK (amount > 0 AND amount = round(amount, 2)),
 "destinationAmount" DECIMAL(24,8),
 "categoryId" TEXT REFERENCES category(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "occurrenceStatus" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
 frequency "RecurrenceFrequency" NOT NULL,
 interval INTEGER NOT NULL DEFAULT 1 CHECK (interval BETWEEN 1 AND 120),
 timezone TEXT NOT NULL,
 "startsAt" TIMESTAMPTZ(3) NOT NULL,
 "endsAt" TIMESTAMPTZ(3),
 "endAfter" INTEGER CHECK ("endAfter" BETWEEN 1 AND 10000),
 "nextIndex" INTEGER NOT NULL DEFAULT 1 CHECK ("nextIndex" >= 1),
 version INTEGER NOT NULL DEFAULT 1,
 "stoppedAt" TIMESTAMPTZ(3),
 "spreadMonthCount" INTEGER CHECK ("spreadMonthCount" BETWEEN 2 AND 120),
 "spreadMonthOffset" INTEGER NOT NULL DEFAULT 0,
 "nextOccurrenceAt" TIMESTAMPTZ(3),
 "pausedAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT recurrence_supported_template CHECK ("destinationId" IS NULL AND "destinationAmount" IS NULL AND "categoryId" IS NOT NULL),
 CONSTRAINT recurrence_end_choice CHECK ("endsAt" IS NULL OR "endAfter" IS NULL),
 CONSTRAINT recurrence_spread_type CHECK ("spreadMonthCount" IS NULL OR type = 'EXPENSE')
);
CREATE INDEX "recurrence_rule_createdById_idx" ON recurrence_rule("createdById");
CREATE INDEX "recurrence_rule_pausedAt_nextOccurrenceAt_idx" ON recurrence_rule("pausedAt", "nextOccurrenceAt");
CREATE INDEX "recurrence_rule_sourceId_idx" ON recurrence_rule("sourceId");
CREATE INDEX "recurrence_rule_destinationId_idx" ON recurrence_rule("destinationId");
CREATE INDEX "recurrence_rule_categoryId_idx" ON recurrence_rule("categoryId");
CREATE TABLE recurrence_occurrence (
 id TEXT PRIMARY KEY,
 "ruleId" TEXT NOT NULL REFERENCES recurrence_rule(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "scheduledFor" TIMESTAMPTZ(3) NOT NULL,
 "transactionId" TEXT UNIQUE REFERENCES "transaction"(id) ON DELETE SET NULL ON UPDATE CASCADE,
 "skippedAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "recurrence_occurrence_ruleId_scheduledFor_key" UNIQUE ("ruleId", "scheduledFor")
);
COMMIT;
