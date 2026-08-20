-- Better Auth >= 1.7 identifies an account by (issuer, accountId) instead of
-- (providerId, accountId): `providerId` stays as the *local* provider config
-- name, while `issuer` names the authority that minted the identity. The column
-- is required and backed by a unique index, so sign-in fails outright without
-- it ("column issuer of relation account does not exist").
-- See https://better-auth.com/docs/guides/1-7-upgrade-guide#account-identity-is-scoped-by-issuer

-- Nullable first: existing rows have no value yet, and adding a NOT NULL column
-- with no default to a populated table would fail.
ALTER TABLE "account" ADD COLUMN "issuer" text;

-- Backfill the issuer each provider now writes at runtime. Keep in sync with
-- the providers in server/utils/auth.ts (SOCIAL_PROVIDER_ENV):
--   - credential (email+password): the `local:` namespace, accountId is already
--     the user's own id, so nothing else to rewrite.
--   - google: declares a real OIDC issuer of its own.
--   - github / vercel: declare none, so Better Auth derives the synthetic
--     `local:oauth:<providerId>` namespace, kept distinct from `local:` so an
--     OAuth provider id can never collide with a local auth method.
-- The final ELSE covers any provider added to the app but not listed here;
-- Better Auth percent-encodes the id (encodeURIComponent), which is a no-op for
-- the plain identifiers used here.
UPDATE "account" SET "issuer" = CASE "providerId"
  WHEN 'credential' THEN 'local:credential'
  WHEN 'google' THEN 'https://accounts.google.com'
  ELSE 'local:oauth:' || "providerId"
END
WHERE "issuer" IS NULL;

ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;

-- Enforces one row per provider identity. If a database already holds duplicate
-- (issuer, accountId) pairs this fails and the whole migration rolls back
-- (the runner wraps each file in a transaction) — reconcile the duplicate rows
-- by hand rather than relaxing the index.
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" ("issuer", "accountId");
