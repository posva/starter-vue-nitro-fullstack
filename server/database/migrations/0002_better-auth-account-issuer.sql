-- Better Auth 1.7 identifies an account by (issuer, accountId) instead of
-- (providerId, accountId), and requires this column — without it every auth
-- write fails with `column "issuer" of relation "account" does not exist`.
-- https://better-auth.com/docs/guides/1-7-upgrade-guide#account-identity-is-scoped-by-issuer

-- Nullable first: a NOT NULL column with no default can't be added to a table
-- that already has rows.
ALTER TABLE "account" ADD COLUMN "issuer" text;

-- These must match what each provider writes at runtime, so keep them in sync
-- with SOCIAL_PROVIDER_ENV in server/utils/auth.ts. Providers declaring no
-- issuer of their own (github, vercel) get a synthetic namespace, distinct from
-- `local:` so a provider id can't collide with a local auth method.
UPDATE "account" SET "issuer" = CASE "providerId"
  WHEN 'credential' THEN 'local:credential'
  WHEN 'google' THEN 'https://accounts.google.com'
  ELSE 'local:oauth:' || "providerId"
END
WHERE "issuer" IS NULL;

ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;

CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" ("issuer", "accountId");
