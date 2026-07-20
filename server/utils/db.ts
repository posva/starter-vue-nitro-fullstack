import type { Database } from 'db0'
import type { PGlite } from '@electric-sql/pglite'
import type { BetterAuthOptions } from 'better-auth'

// Row shapes. The SQL migrations are the schema's source of truth
// (server/database/migrations) — keep these in sync by hand.
export interface Todo {
  id: string
  title: string
  completed: boolean
  userId: string | null
  createdAt: Date
}

let _db: Database | undefined

/**
 * Lazily open (and cache) the database — a db0 instance
 * (https://db0.unjs.io, the connector layer behind Nitro's `useDatabase`).
 *
 * - Production (`DATABASE_URL` set): db0's `postgresql` connector (node-postgres)
 *   — works with Neon's pooled connection string on Vercel or any Node host.
 * - Local dev (no `DATABASE_URL`): PGlite, an in-process Postgres (WASM)
 *   persisted to `.data/pg` — zero setup, no Docker, same Postgres dialect.
 */
export async function useDb(): Promise<Database> {
  if (_db) return _db

  const url = process.env.DATABASE_URL

  // `import.meta.env.DEV` is a build-time constant: in production builds the whole
  // PGlite branch (and its 700kB+ WASM) is dead-code-eliminated, keeping the bundle
  // edge/serverless-safe. PGlite is only ever the local-dev fallback.
  if (import.meta.env.DEV && !url) {
    const [{ mkdirSync }, { resolve }, { createDatabase }, { default: pglite }] = await Promise.all(
      [import('node:fs'), import('node:path'), import('db0'), import('db0/connectors/pglite')],
    )
    const dataDir = resolve('.data/pg')
    mkdirSync(dataDir, { recursive: true })
    _db = createDatabase(pglite({ dataDir }))
  } else {
    if (!url) throw new Error('DATABASE_URL is required outside local dev')
    const [{ createDatabase }, { default: postgresql }] = await Promise.all([
      import('db0'),
      import('db0/connectors/postgresql'),
    ])
    _db = createDatabase(postgresql({ url }))
  }

  return _db
}

/**
 * The database handle Better Auth's built-in Kysely adapter runs on.
 *
 * - Production: a dedicated `pg` Pool on `DATABASE_URL` (Better Auth manages
 *   its own queries; db0 keeps its own single connection for app queries).
 * - Local dev: a Kysely dialect over the SAME PGlite instance as `useDb()` —
 *   two PGlite instances on one `dataDir` would fight over the lock.
 */
export async function useAuthDatabase(): Promise<NonNullable<BetterAuthOptions['database']>> {
  const url = process.env.DATABASE_URL

  if (import.meta.env.DEV && !url) {
    const [db, { pgliteDialect }] = await Promise.all([useDb(), import('./pglite-dialect')])
    const client = (await db.getInstance()) as PGlite
    return { dialect: pgliteDialect(client), type: 'postgres' }
  }

  if (!url) throw new Error('DATABASE_URL is required outside local dev')
  const { default: pg } = await import('pg')
  return new pg.Pool({ connectionString: url })
}
