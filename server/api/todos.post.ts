import { defineHandler, HTTPError } from 'nitro'
import { readBody } from 'nitro/h3'
import { useDrizzle, tables } from '../utils/drizzle'
import { useAuth } from '../utils/auth'

// POST /api/todos { title } -> create a todo, tagged with the signed-in user
// (or null for anonymous visitors).
export default defineHandler(async (event) => {
  const body = await readBody<{ title?: string }>(event)
  const title = body?.title?.trim()
  if (!title) {
    throw new HTTPError('title is required', { status: 400 })
  }

  const auth = await useAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  const db = await useDrizzle()
  const [todo] = await db
    .insert(tables.todos)
    .values({ title, userId: session?.user.id ?? null })
    .returning()
  return todo
})
