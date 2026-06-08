import { timestamp } from 'drizzle-orm/pg-core'

// Shared column helper: a non-null creation timestamp defaulting to now().
export const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
