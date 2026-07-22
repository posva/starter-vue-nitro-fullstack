import { defineHandler, HTTPError } from 'nitro'
import { getValidatedRouterParams, readValidatedBody } from 'nitro/h3'
import * as z from 'zod'
import { useDb, type Todo } from '../../utils/db'

// Validating the id also guards the query: Postgres errors (500) on malformed
// uuid casts. Invalid params/body throw a 400 with the zod issues as data.
const paramsSchema = z.object({ todoId: z.uuid() })
const bodySchema = z.object({ completed: z.boolean() })

// PATCH /api/todos/:todoId { completed } -> update a todo's completion
export default defineHandler(async (event) => {
  const { todoId } = await getValidatedRouterParams(event, paramsSchema)
  const { completed } = await readValidatedBody(event, bodySchema)

  const db = await useDb()
  const { rows } = await db.sql<{ rows: Todo[] }>`
    UPDATE "todos" SET "completed" = ${completed}
    WHERE "id" = ${todoId}
    RETURNING *`
  if (!rows[0]) {
    throw new HTTPError('Todo not found', { status: 404 })
  }
  return rows[0]
})
