BEGIN;
CREATE TYPE "AccountRole" AS ENUM ('COLLABORATOR','VIEWER');
CREATE TABLE account_membership (
  "financialAccountId" text NOT NULL REFERENCES financial_account(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  role "AccountRole" NOT NULL,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz(3) NOT NULL,
  PRIMARY KEY ("financialAccountId","userId")
);
CREATE INDEX "account_membership_userId_idx" ON account_membership("userId");
CREATE TABLE account_invitation (
  id text PRIMARY KEY,
  "financialAccountId" text NOT NULL REFERENCES financial_account(id) ON DELETE CASCADE ON UPDATE CASCADE,
  email text NOT NULL CHECK (email = lower(trim(email))),
  role "AccountRole" NOT NULL,
  "tokenHash" text NOT NULL UNIQUE,
  "invitedById" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" timestamptz(3) NOT NULL,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("financialAccountId",email)
);
CREATE FUNCTION reject_owner_membership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM financial_account WHERE id=NEW."financialAccountId" AND "ownerId"=NEW."userId") THEN
    RAISE EXCEPTION 'Owner cannot be a member';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_member_owner BEFORE INSERT OR UPDATE ON account_membership FOR EACH ROW EXECUTE FUNCTION reject_owner_membership();
COMMIT;
