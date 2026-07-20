import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Database } from 'db0'

/**
 * Plain-SQL migration runner: applies the pending `.sql` files from
 * `server/database/migrations` in filename order, recording each in a
 * `_migrations` table. One migration = one transaction, recorded atomically
 * with its statements, so a failed file rolls back fully and stays pending.
 *
 * Returns the list of migrations it applied.
 */
export async function runMigrations(
  db: Database,
  dir = 'server/database/migrations',
): Promise<string[]> {
  await exec(
    db,
    `CREATE TABLE IF NOT EXISTS "_migrations" ("name" text PRIMARY KEY, "applied_at" timestamptz NOT NULL DEFAULT now())`,
  )

  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()

  const appliedRows = await db.sql<{ rows: { name: string }[] }>`SELECT "name" FROM "_migrations"`
  const applied = new Set((appliedRows.rows ?? []).map((r) => r.name))

  // Take over a database migrated by the previous drizzle-kit setup: its schema
  // already matches the squashed init, so record it as applied instead of
  // running it (later migrations still apply normally).
  if (applied.size === 0 && (await isDrizzleManaged(db))) {
    await db.sql`INSERT INTO "_migrations" ("name") VALUES (${BASELINE}) ON CONFLICT DO NOTHING`
    applied.add(BASELINE)
  }

  const ran: string[] = []
  // oxlint-disable no-await-in-loop -- migrations must apply strictly in order
  for (const name of files) {
    if (applied.has(name)) continue
    const sql = await readFile(join(dir, name), 'utf8')
    const record = `INSERT INTO "_migrations" ("name") VALUES ('${name.replaceAll("'", "''")}')`
    try {
      await exec(db, `BEGIN;\n${sql}\n${record};\nCOMMIT;`)
    } catch (error) {
      // Leave the session usable (an aborted tx would poison later queries).
      await exec(db, 'ROLLBACK').catch(() => {})
      throw new Error(`[db] migration ${name} failed`, { cause: error })
    }
    ran.push(name)
  }
  return ran
}

/** The squashed representation of the old drizzle-kit migration history. */
const BASELINE = '0000_init.sql'

async function isDrizzleManaged(db: Database): Promise<boolean> {
  const { rows } = await db.sql<{ rows: { found: unknown }[] }>`
    SELECT to_regclass('drizzle.__drizzle_migrations') AS found`
  return rows?.[0]?.found != null
}

// db0's `exec` runs through the driver's regular query path, which for PGlite
// is single-statement (extended protocol). PGlite's own `exec` runs whole
// scripts, so prefer it when the underlying instance has one; node-postgres
// runs multi-statement strings through the regular path fine (simple protocol).
async function exec(db: Database, sql: string): Promise<void> {
  const instance = (await db.getInstance()) as { exec?: (sql: string) => Promise<unknown> }
  if (typeof instance.exec === 'function') await instance.exec(sql)
  else await db.exec(sql)
}
