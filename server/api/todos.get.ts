import { defineHandler } from 'nitro'
import { useDb, type Todo } from '../utils/db'

// GET /api/todos -> list todos (newest first)
export default defineHandler(async () => {
  const db = await useDb()
  const { rows } = await db.sql<{ rows: Todo[] }>`
    SELECT * FROM "todos" ORDER BY "createdAt" DESC`
  return rows
})
