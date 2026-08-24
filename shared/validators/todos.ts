import { Container } from 'validup'
import { createValidator } from '@validup/zod'
import * as z from 'zod'
import type { NewTodoPayload } from '#shared/api/todos'

// One container, both sides: the form mounts it through `useValidup` and
// `POST /api/todos` runs it on the request body. The rule and its message are
// written once, so the client can't drift from what the server enforces.
//
// `.trim()` transforms, so `run()`/`safeRun()` hand back the trimmed title —
// that is what the handler inserts and what the form submits.
export const todoDraftValidator = new Container<NewTodoPayload>()

todoDraftValidator.mount('title', createValidator(z.string().trim().min(1, 'Title is required')))
