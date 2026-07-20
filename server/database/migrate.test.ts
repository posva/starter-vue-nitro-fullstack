import { test, expect } from 'vitest'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createDatabase } from 'db0'
import pglite from 'db0/connectors/pglite'
import { runMigrations } from './migrate'

const MIGRATIONS_DIR = 'server/database/migrations'

// In-memory PGlite, same connector the app uses in dev.
function freshDb() {
  return createDatabase(pglite({}))
}

test('applies every migration to an empty database, in order', async () => {
  const db = freshDb()
  const applied = await runMigrations(db)

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
  expect(applied).toEqual(files)

  // Final schema is Better Auth's camelCase naming (0000 snake_case + 0001 renames).
  const todos = await db.sql`SELECT "id", "title", "completed", "userId", "createdAt" FROM "todos"`
  expect(todos.rows).toEqual([])
  const users = await db.sql`SELECT "emailVerified" FROM "user"`
  expect(users.rows).toEqual([])
  const passkeys = await db.sql`SELECT "credentialID" FROM "passkey"`
  expect(passkeys.rows).toEqual([])
})

test('is idempotent — a second run applies nothing', async () => {
  const db = freshDb()
  await runMigrations(db)
  expect(await runMigrations(db)).toEqual([])
})

test('a failing migration rolls back atomically and does not get recorded', async () => {
  const db = freshDb()
  await runMigrations(db)

  // A migration whose first statement succeeds and second fails: the whole file
  // must roll back (no `broken` table) and stay pending (not in _migrations).
  const { mkdtemp, writeFile, cp } = await import('node:fs/promises')
  const dir = await mkdtemp(join((await import('node:os')).tmpdir(), 'migrations-'))
  await cp(MIGRATIONS_DIR, dir, { recursive: true })
  await writeFile(
    join(dir, '0002_broken.sql'),
    'CREATE TABLE "broken" ("id" text);\nSELECT nope();',
  )

  await expect(runMigrations(db, dir)).rejects.toThrow(/0002_broken/)
  const { rows } = await db.sql`SELECT to_regclass('public.broken') AS found`
  expect(rows![0]!.found).toBeNull()

  // The runner recovers: fixing the migration applies it on the next run.
  await writeFile(join(dir, '0002_broken.sql'), 'CREATE TABLE "broken" ("id" text);')
  expect(await runMigrations(db, dir)).toEqual(['0002_broken.sql'])
})

test('takes over a drizzle-managed database without re-running the init migration', async () => {
  const db = freshDb()

  // Simulate a database the previous drizzle-kit setup migrated: snake_case
  // schema plus drizzle's journal table.
  const instance = await db.getInstance()
  await instance.exec(await readFile(join(MIGRATIONS_DIR, '0000_init.sql'), 'utf8'))
  await instance.exec(
    `CREATE SCHEMA "drizzle";
     CREATE TABLE "drizzle"."__drizzle_migrations" ("id" serial PRIMARY KEY, "hash" text NOT NULL, "created_at" bigint);`,
  )

  const applied = await runMigrations(db)
  // 0000 is baselined (already applied by drizzle), later migrations still run.
  expect(applied).not.toContain('0000_init.sql')
  expect(applied).toContain('0001_better-auth-column-names.sql')

  // The renames landed on the drizzle-created schema.
  const users = await db.sql`SELECT "emailVerified" FROM "user"`
  expect(users.rows).toEqual([])
})
