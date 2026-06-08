import { definePlugin } from 'nitro'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { resolve } from 'node:path'
import { useDrizzle } from '../utils/drizzle'

// Registered only in development via `nitro({ plugins })` in vite.config.ts, so
// neither this code nor the migrator ships in production builds. It auto-applies
// pending migrations to the local PGlite database for a zero-setup local DX.
// In production, run `pnpm db:migrate` against DATABASE_URL as a deploy step.
export default definePlugin(() => {
  // Defense-in-depth: this plugin is registered only in dev (vite.config.ts gates on
  // `env.mode === 'development'`). If it ever runs in a production build, that's a
  // misconfiguration — fail loudly instead of silently skipping migrations.
  if (!import.meta.env.DEV) {
    throw new Error(
      '[db] dev-migration-plugin must not run in production — apply migrations with `pnpm db:migrate`',
    )
  }

  // Pointing local dev at a real Postgres (DATABASE_URL) is a valid choice; the PGlite
  // migrator does not apply there, so skip and let `pnpm db:migrate` handle it.
  if (process.env.DATABASE_URL) return

  void (async () => {
    const db = await useDrizzle()
    const migrationsFolder = resolve(process.cwd(), 'server/database/migrations')
    await migrate(db as never, { migrationsFolder })
  })().catch((error) => {
    console.error('[db] failed to apply migrations', error)
  })
})
