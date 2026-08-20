/**
 * Pull a human-readable message off an unknown thrown value, with a fallback.
 */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  return err instanceof Error ? err.message : fallback
}

/**
 * API (mande) errors are "expected" by data loaders: don't abort the
 * navigation.
 */
export { isMandeError as isExpectedApiError } from 'mande'
