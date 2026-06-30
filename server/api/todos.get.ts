import { defineHandler } from 'nitro'
import { useDrizzle, tables, desc } from '../utils/drizzle'

// GET /api/todos -> list todos (newest first)
export default defineHandler(async () => {
  const db = await useDrizzle()
  return db.select().from(tables.todos).orderBy(desc(tables.todos.createdAt))
})
