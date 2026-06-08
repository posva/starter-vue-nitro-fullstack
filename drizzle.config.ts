import { defineConfig } from 'drizzle-kit'

// Postgres dialect. `db:generate` needs no connection. `db:migrate` (deploy/CI)
// applies migrations to DATABASE_URL (Neon or any Postgres). Local PGlite is
// migrated automatically by the dev startup plugin, not by drizzle-kit.
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
