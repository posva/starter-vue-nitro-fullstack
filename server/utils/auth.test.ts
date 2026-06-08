import { test, expect, beforeAll } from 'vitest'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { betterAuth } from 'better-auth'
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
})

test('account linking is enabled for the OAuth providers (email-match linking)', async () => {
  // The product requirement: signing in through a different provider with a
  // matching email links to the same account instead of duplicating it. Full
  // OAuth-callback coverage needs provider mocking (see todos/), but we assert
  // the config that drives it is actually on.
  const ctx = await auth.$context
  expect(ctx.options.account?.accountLinking?.enabled).toBe(true)
  expect(ctx.options.account?.accountLinking?.trustedProviders).toEqual(
    expect.arrayContaining(['google', 'github', 'vercel']),
  )
})
