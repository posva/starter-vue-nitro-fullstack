-- Better Auth's built-in Kysely adapter uses its field names as column names
-- (camelCase, e.g. "emailVerified") and, unlike the removed drizzle adapter,
-- has no column-mapping layer. Rename the snake_case columns drizzle-kit
-- created so the schema matches what Better Auth (and `@better-auth/cli
-- generate` for future plugins) expects out of the box.

ALTER TABLE "user" RENAME COLUMN "email_verified" TO "emailVerified";
ALTER TABLE "user" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "user" RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "session" RENAME COLUMN "expires_at" TO "expiresAt";
ALTER TABLE "session" RENAME COLUMN "ip_address" TO "ipAddress";
ALTER TABLE "session" RENAME COLUMN "user_agent" TO "userAgent";
ALTER TABLE "session" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE "session" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "session" RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "account" RENAME COLUMN "account_id" TO "accountId";
ALTER TABLE "account" RENAME COLUMN "provider_id" TO "providerId";
ALTER TABLE "account" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE "account" RENAME COLUMN "access_token" TO "accessToken";
ALTER TABLE "account" RENAME COLUMN "refresh_token" TO "refreshToken";
ALTER TABLE "account" RENAME COLUMN "id_token" TO "idToken";
ALTER TABLE "account" RENAME COLUMN "access_token_expires_at" TO "accessTokenExpiresAt";
ALTER TABLE "account" RENAME COLUMN "refresh_token_expires_at" TO "refreshTokenExpiresAt";
ALTER TABLE "account" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "account" RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "verification" RENAME COLUMN "expires_at" TO "expiresAt";
ALTER TABLE "verification" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "verification" RENAME COLUMN "updated_at" TO "updatedAt";

-- The passkey plugin's field is `credentialID` (not `credentialId`).
ALTER TABLE "passkey" RENAME COLUMN "public_key" TO "publicKey";
ALTER TABLE "passkey" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE "passkey" RENAME COLUMN "credential_id" TO "credentialID";
ALTER TABLE "passkey" RENAME COLUMN "device_type" TO "deviceType";
ALTER TABLE "passkey" RENAME COLUMN "backed_up" TO "backedUp";
ALTER TABLE "passkey" RENAME COLUMN "created_at" TO "createdAt";

-- Not an auth table, but align the demo table too: `SELECT *` then matches the
-- shape the frontend consumes (app/queries/todos.ts) with no aliasing.
ALTER TABLE "todos" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE "todos" RENAME COLUMN "created_at" TO "createdAt";
