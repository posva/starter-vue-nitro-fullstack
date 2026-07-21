import { test, expect, beforeAll } from 'vitest'
import { mockConsoleWarn, mockConsoleError } from '../../test/mock-warn'
import { createDatabase, type Database } from 'db0'
import pglite from 'db0/connectors/pglite'
import type { PGlite } from '@electric-sql/pglite'
import { pgliteDialect } from './pglite-dialect'
import { betterAuth } from 'better-auth'
import { handleOAuthUserInfo } from 'better-auth/oauth2'
import { runMigrations } from '../database/migrate'
import { authOptions } from './auth'

// End-to-end check of the real server auth stack: the SQL migrations, the
// Better Auth Kysely adapter (over PGlite, wired exactly like dev — one shared
// PGlite instance behind db0), password hashing and the account model. If a
// column name drifts from what Better Auth expects (the most common
// integration break since the schema is hand-written SQL), these fail.
let auth: ReturnType<typeof betterAuth>
let db: Database

mockConsoleWarn()
mockConsoleError()

beforeAll(async () => {
  db = createDatabase(pglite({}))
  await runMigrations(db)
  // `db` is typed as the generic `Database`, which erases the instance type.
  const dialect = pgliteDialect((await db.getInstance()) as PGlite)
  auth = betterAuth(authOptions({ dialect, type: 'postgres' }))
})

test('email + password sign-up creates a user with a credential account', async () => {
  const res = await auth.api.signUpEmail({
    body: { name: 'Ada', email: 'ada@example.com', password: 'supersecret123' },
  })
  expect(res.user.email).toBe('ada@example.com')

  // One user row, and a linked credential (email+password) account row.
  const users = await db.sql<{ rows: { id: string }[] }>`
    SELECT "id" FROM "user" WHERE "email" = ${'ada@example.com'}`
  expect(users.rows).toHaveLength(1)

  const accounts = await db.sql<{ rows: { providerId: string; password: string | null }[] }>`
    SELECT "providerId", "password" FROM "account" WHERE "userId" = ${users.rows[0]!.id}`
  expect(accounts.rows).toHaveLength(1)
  expect(accounts.rows[0]!.providerId).toBe('credential')
  expect(accounts.rows[0]!.password).toBeTruthy()

  // Sign-up triggers a verification email; with no mail provider wired up it's
  // logged instead of sent.
  expect('[email] not sent').toHaveBeenWarned()
})

test('valid credentials sign in, wrong password is rejected', async () => {
  await auth.api.signUpEmail({
    body: { name: 'Linus', email: 'linus@example.com', password: 'correct-horse-battery' },
  })

  const ok = await auth.api.signInEmail({
    body: { email: 'linus@example.com', password: 'correct-horse-battery' },
  })
  expect(ok.token).toBeTruthy()

  await expect(
    auth.api.signInEmail({ body: { email: 'linus@example.com', password: 'wrong-password' } }),
  ).rejects.toThrow()

  // Sign-up logs the unsent verification email; the rejected sign-in is logged
  // by Better Auth as a warning.
  expect('[email] not sent').toHaveBeenWarned()
  expect('Invalid password').toHaveBeenWarned()
})

test('signing in via a trusted provider links to the existing email account', async () => {
  // The headline requirement: a logged-out social sign-in whose email already
  // belongs to a local (email+password) account links into that account instead
  // of erroring with `account_not_linked` or creating a duplicate user.
  //
  // We drive Better Auth's real OAuth-link path (`handleOAuthUserInfo`) with a
  // faked provider profile — no live OAuth needed. The local account is
  // unverified (no mail provider wired up), so this also guards the
  // `accountLinking.requireLocalEmailVerified: false` setting: remove it and
  // Better Auth refuses the link and this test fails.
  const email = 'linkme@example.com'
  await auth.api.signUpEmail({ body: { name: 'Linkme', email, password: 'supersecret123' } })

  const ctx = await auth.$context
  const result = await handleOAuthUserInfo(
    { context: ctx, request: undefined } as never,
    {
      userInfo: { id: 'vercel-user-1', email, emailVerified: true, name: 'Linkme' },
      account: { providerId: 'vercel', accountId: 'vercel-user-1' },
      callbackURL: '/account',
      disableSignUp: false,
    } as never,
  )

  expect(result.error).toBeNull()
  expect(result.data?.user.email).toBe(email)

  // Exactly one user, now with both a credential and a vercel account.
  const users = await db.sql<{ rows: { id: string }[] }>`
    SELECT "id" FROM "user" WHERE "email" = ${email}`
  expect(users.rows).toHaveLength(1)
  const accounts = await db.sql<{ rows: { providerId: string }[] }>`
    SELECT "providerId" FROM "account" WHERE "userId" = ${users.rows[0]!.id}`
  expect(accounts.rows!.map((a) => a.providerId).sort()).toEqual(['credential', 'vercel'])

  // The local sign-up logs its unsent verification email.
  expect('[email] not sent').toHaveBeenWarned()
})
