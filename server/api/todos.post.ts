import { defineHandler, HTTPError } from 'nitro'
import { readBody } from 'nitro/h3'
import { useDb, type Todo } from '../utils/db'
import { useAuth } from '../utils/auth'

// POST /api/todos { title } -> create a todo, tagged with the signed-in user
// (or null for anonymous visitors).
export default defineHandler(async (event) => {
  const body = await readBody<{ title?: string }>(event)
  const title = body?.title?.trim()
  if (!title) {
    throw new HTTPError('title is required', { status: 400 })
  }
  // Demo escape hatch: lets you see the optimistic rollback + toast in action.
  if (title === 'fail') {
    throw new HTTPError('Simulated failure (title was "fail")', { status: 500 })
  }

  const auth = await useAuth()
  const session = await auth.api.getSession({ headers: event.req.headers })

  const db = await useDb()
  const { rows } = await db.sql<{ rows: Todo[] }>`
    INSERT INTO "todos" ("title", "userId")
    VALUES (${title}, ${session?.user.id ?? null})
    RETURNING *`
  return rows[0]
})
