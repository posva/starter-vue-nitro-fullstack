import { defineQueryOptions } from '@pinia/colada'
import { todos } from '#shared/api/todos'

export interface Todo {
  id: string
  title: string
  completed: boolean
  userId: string | null
  createdAt: string
}

export const TODO_QUERY_KEYS = {
  root: ['todos'] as const,
  byId: (id: string) => [...TODO_QUERY_KEYS.root, id] as const,
}

export const todoListQuery = defineQueryOptions({
  key: TODO_QUERY_KEYS.root,
  query: () => todos.get<Todo[]>('/'),
})
