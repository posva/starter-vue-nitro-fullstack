import { pgTable, serial, text } from 'drizzle-orm/pg-core'
import { createdAt } from './utils'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt,
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
