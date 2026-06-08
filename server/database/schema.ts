import { pgTable, uuid, text } from 'drizzle-orm/pg-core'
import { createdAt } from './utils'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt,
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
