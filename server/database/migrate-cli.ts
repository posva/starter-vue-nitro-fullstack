// `pnpm db:migrate` — applies pending migrations to DATABASE_URL (the deploy
// step: Vercel's buildCommand runs it before `pnpm build`), or to the local
// PGlite database when DATABASE_URL is unset (dev normally auto-migrates via
// the dev plugin; this covers running it by hand).
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createDatabase } from 'db0'
import { runMigrations } from './migrate.ts'

const url = process.env.DATABASE_URL

let db
if (url) {
  const { default: postgresql } = await import('db0/connectors/postgresql')
  db = createDatabase(postgresql({ url }))
} else {
  const dataDir = resolve('.data/pg')
  mkdirSync(dataDir, { recursive: true })
  const { default: pglite } = await import('db0/connectors/pglite')
  db = createDatabase(pglite({ dataDir }))
}

const applied = await runMigrations(db)
// oxlint-disable-next-line no-console -- CLI status output
console.log(
  applied.length > 0
    ? `[db] applied ${applied.length} migration(s): ${applied.join(', ')}`
    : '[db] already up to date',
)
await db.dispose()
