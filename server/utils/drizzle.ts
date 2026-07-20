import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../database/schema'

// Re-export common drizzle helpers + the schema so handlers only import from here.
export { sql, eq, and, or, desc, asc } from 'drizzle-orm'
export const tables = schema

// Both backends produce a Postgres-dialect Drizzle db with the same query API,
// so we type against one of them.
export type Drizzle = NodePgDatabase<typeof schema>

let _db: Drizzle | undefined

/**
 * Lazily open (and cache) the database.
 *
 * - Production (`DATABASE_URL` set): node-postgres (TCP) — the right default on
 *   Vercel's Fluid compute (and any Node host), where connections are reused
 *   across invocations. Use Neon's pooled (`-pooler`) connection string.
 * - Local dev (no `DATABASE_URL`): PGlite, an in-process Postgres (WASM) persisted
 *   to `.data/pg` — zero setup, no Docker, same Postgres dialect.
 */
export async function useDrizzle(): Promise<Drizzle> {
  if (_db) return _db

  const url = process.env.DATABASE_URL

  // `import.meta.env.DEV` is a build-time constant: in production builds the whole
  // PGlite branch (and its 700kB+ WASM) is dead-code-eliminated, keeping the bundle
  // serverless-safe. PGlite is only ever the local-dev fallback.
  if (import.meta.env.DEV && !url) {
    const [{ mkdirSync }, { resolve }, { drizzle }] = await Promise.all([
      import('node:fs'),
      import('node:path'),
      import('drizzle-orm/pglite'),
    ])
    const dataDir = resolve('.data/pg')
    mkdirSync(dataDir, { recursive: true })
    _db = drizzle({ connection: { dataDir }, schema }) as unknown as Drizzle
  } else {
    if (!url) throw new Error('DATABASE_URL is required outside local dev')
    const { drizzle } = await import('drizzle-orm/node-postgres')
    _db = drizzle(url, { schema })
  }

  return _db
}
