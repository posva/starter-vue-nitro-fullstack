import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL

// Postgres dialect. `db:generate` needs no connection.
//
// With DATABASE_URL set (prod/CI): `db:migrate` and `db:studio` target that
// Postgres (Neon or any). Without it (local dev): point drizzle-kit at the same
// PGlite database `useDrizzle()` persists to `.data/pg`, so `db:studio` works
// locally — handy for inspecting/editing rows (e.g. deleting a user to retry a
// sign-up). PGlite allows a single connection, so stop `pnpm dev` first.
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  ...(url ? { dbCredentials: { url } } : { driver: 'pglite', dbCredentials: { url: '.data/pg' } }),
})
