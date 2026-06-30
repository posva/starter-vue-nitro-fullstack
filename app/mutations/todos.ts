import { defineMutation, useMutation, useQueryCache } from '@pinia/colada'
import { todos } from '#shared/api/todos'
import { TODO_QUERY_KEYS, type Todo } from '~/queries/todos'

export interface NewTodoPayload {
  title: string
}

export const useCreateTodo = defineMutation(() => {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (payload: NewTodoPayload) => todos.post<Todo>(payload),
    onSettled() {
      // Refresh any list of todos (todos/index.vue, …).
      queryCache.invalidateQueries({ key: TODO_QUERY_KEYS.root })
    },
  })
})
