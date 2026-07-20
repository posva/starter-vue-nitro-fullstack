import { test, expect, beforeAll } from 'vitest'
import { resolve } from 'node:path'
import { mockConsoleWarn, mockConsoleError } from '../../test/mock-warn'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { betterAuth } from 'better-auth'
import { handleOAuthUserInfo } from 'better-auth/oauth2'
import { eq } from 'drizzle-orm'
import * as schema from '../database/schema'
import { authOptions } from './auth'

// End-to-end check of the real server auth stack: the hand-written Drizzle
// schema, the Better Auth drizzle adapter mapping, password hashing and the
// account model — all wired exactly as production uses them, but against an
// in-memory PGlite. If a schema field name drifts from what Better Auth
// expects (the most common integration break), these fail.
let auth: ReturnType<typeof betterAuth>
let db: ReturnType<typeof drizzle<typeof schema>>

mockConsoleWarn()
mockConsoleError()

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder: resolve(process.cwd(), 'server/database/migrations') })
  auth = betterAuth(authOptions(db))
})

test('email + password sign-up creates a user with a credential account', async () => {
  const res = await auth.api.signUpEmail({
    body: { name: 'Ada', email: 'ada@example.com', password: 'supersecret123' },
  })
  expect(res.user.email).toBe('ada@example.com')

  // One user row, and a linked credential (email+password) account row.
  const users = await db.select().from(schema.user).where(eq(schema.user.email, 'ada@example.com'))
  expect(users).toHaveLength(1)

  const accounts = await db
    .select()
    .from(schema.account)
    .where(eq(schema.account.userId, users[0]!.id))
  expect(accounts).toHaveLength(1)
  expect(accounts[0]!.providerId).toBe('credential')
  expect(accounts[0]!.password).toBeTruthy()

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
  const users = await db.select().from(schema.user).where(eq(schema.user.email, email))
  expect(users).toHaveLength(1)
  const accounts = await db
    .select()
    .from(schema.account)
    .where(eq(schema.account.userId, users[0]!.id))
  expect(accounts.map((a) => a.providerId).sort()).toEqual(['credential', 'vercel'])

  // The local sign-up logs its unsent verification email.
  expect('[email] not sent').toHaveBeenWarned()
})
