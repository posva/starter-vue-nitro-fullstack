import { defineMutation, useMutation, useQueryCache } from '@pinia/colada'
import { createTodo, type NewTodoPayload } from '#shared/api/todos'
import { TODO_QUERY_KEYS } from '~/queries/todos'

export const useCreateTodo = defineMutation(() => {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (payload: NewTodoPayload) => createTodo(payload),
    onSettled() {
      // Refresh any list of todos (todos/index.vue, …).
      queryCache.invalidateQueries({ key: TODO_QUERY_KEYS.root })
    },
  })
})
