import { pgTable, uuid, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core'
import { createdAt } from './utils'

// ---------------------------------------------------------------------------
// Better Auth tables.
//
// These match the schema Better Auth's drizzle adapter expects: the *property
// keys* (id, emailVerified, userId, …) are the field names Better Auth reads,
// the SQL column names are snake_cased for Postgres convention. IDs are text
// because Better Auth generates them itself.
// ---------------------------------------------------------------------------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  // Hashed password for the email+password ("credential") provider.
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Added by the @better-auth/passkey plugin (WebAuthn credentials).
export const passkey = pgTable('passkey', {
  id: text('id').primaryKey(),
  name: text('name'),
  publicKey: text('public_key').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  credentialID: text('credential_id').notNull(),
  counter: integer('counter').notNull(),
  deviceType: text('device_type').notNull(),
  backedUp: boolean('backed_up').notNull(),
  transports: text('transports'),
  aaguid: text('aaguid'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type AuthUser = typeof user.$inferSelect
export type Session = typeof session.$inferSelect

// ---------------------------------------------------------------------------
// Demo table (not part of auth): showcases raw Drizzle usage in /api/todos.
//
// `userId` links a todo to the signed-in user who created it, or is null for
// anonymous visitors — so the demo doubles as an example of joining your own
// data to Better Auth's `user` table.
// ---------------------------------------------------------------------------
export const todos = pgTable('todos', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  completed: boolean('completed').notNull().default(false),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  createdAt,
})

export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
