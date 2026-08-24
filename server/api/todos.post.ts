import { defineHandler, HTTPError } from 'nitro'
import { readBody } from 'nitro/h3'
import { todoDraftValidator } from '#shared/validators/todos'
import { useDb, type Todo } from '../utils/db'
import { useAuth } from '../utils/auth'

// POST /api/todos { title } -> create a todo, tagged with the signed-in user
// (or null for anonymous visitors).
export default defineHandler(async (event) => {
  const body = await readBody<{ title?: string }>(event)

  // Same container the form runs, so there is one statement of the rule rather
  // than a hand-rolled check here and a schema over in the page. Like the PATCH
  // route, an invalid body is a 400 carrying the issues as `data`; `title` comes
  // back trimmed because the validator transforms.
  const result = await todoDraftValidator.safeRun(body)
  if (!result.success) {
    throw new HTTPError(result.error.issues[0]?.message ?? result.error.message, {
      status: 400,
      data: result.error.issues,
    })
  }
  const { title } = result.data
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
