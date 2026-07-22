import { defineQueryOptions } from '@pinia/colada'
import { getTodoList } from '#shared/api/todos'

export const TODO_QUERY_KEYS = {
  root: ['todos'] as const,
  byId: (id: string) => [...TODO_QUERY_KEYS.root, id] as const,
}

export const todoListQuery = defineQueryOptions({
  key: TODO_QUERY_KEYS.root,
  query: getTodoList,
})
