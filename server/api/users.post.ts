import { defineHandler, HTTPError } from 'nitro'
import { readBody } from 'nitro/h3'
import { useDrizzle, tables } from '../utils/drizzle'

// POST /api/users { name, email } -> create user
export default defineHandler(async (event) => {
  const body = await readBody<{ name?: string; lastName?: string; email?: string }>(event)
  if (!body?.name || !body?.email) {
    throw new HTTPError('name and email are required', { status: 400 })
  }

  const db = await useDrizzle()
  const [user] = await db
    .insert(tables.users)
    .values({ name: body.name, lastName: body.lastName || null, email: body.email })
    .returning()
  return user
})
