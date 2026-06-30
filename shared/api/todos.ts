import { fetch } from '#shared/fetch'
import { mande } from 'mande'

export const todos = mande('/api/todos', {}, fetch)
