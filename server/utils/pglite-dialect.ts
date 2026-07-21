import type { PGlite } from '@electric-sql/pglite'
import {
  CompiledQuery,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type DatabaseConnection,
  type Dialect,
  type QueryResult,
} from 'kysely'

/**
 * Minimal Kysely dialect over an existing PGlite instance, so Better Auth can
 * run on the same local database as `useDb()` in dev/tests. This is what the
 * `kysely-pglite` package provides, minus its CLI/codegen dependency tree (and
 * its published build is broken against kysely >= 0.29, which moved `Migrator`
 * to `kysely/migration`).
 *
 * PGlite is a single session, so every "connection" is the same one — fine for
 * dev, where requests are effectively serialized anyway.
 */
export function pgliteDialect(client: PGlite): Dialect {
  const connection: DatabaseConnection = {
    async executeQuery<R>(compiled: CompiledQuery): Promise<QueryResult<R>> {
      const result = await client.query<R>(compiled.sql, [...compiled.parameters])
      return { rows: result.rows, numAffectedRows: BigInt(result.affectedRows ?? 0) }
    },
    // oxlint-disable-next-line require-yield -- kysely wants an async iterator; it only ever throws
    async *streamQuery(): AsyncIterableIterator<never> {
      throw new Error('PGlite does not support streaming')
    },
  }

  return {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => ({
      async init() {},
      async acquireConnection() {
        return connection
      },
      async beginTransaction(conn: DatabaseConnection) {
        await conn.executeQuery(CompiledQuery.raw('BEGIN'))
      },
      async commitTransaction(conn: DatabaseConnection) {
        await conn.executeQuery(CompiledQuery.raw('COMMIT'))
      },
      async rollbackTransaction(conn: DatabaseConnection) {
        await conn.executeQuery(CompiledQuery.raw('ROLLBACK'))
      },
      async releaseConnection() {},
      async destroy() {
        await client.close()
      },
    }),
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  }
}
