import { defineHandler } from 'nitro'
import { useDrizzle, tables, desc } from '../utils/drizzle'

// GET /api/users -> list users
export default defineHandler(async () => {
  const db = await useDrizzle()
  return db.select().from(tables.users).orderBy(desc(tables.users.createdAt))
})
