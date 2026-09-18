-- Better Auth 1.7.3 restored account identity to (providerId, accountId).
DROP INDEX "account_issuer_accountId_uidx";

ALTER TABLE "account" DROP COLUMN "issuer";

CREATE UNIQUE INDEX "account_providerId_accountId_uidx"
  ON "account" ("providerId", "accountId");
