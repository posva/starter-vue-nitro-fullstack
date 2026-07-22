import { defineMutation, useMutation, useQueryCache } from '@pinia/colada'
import { useToast } from '@nuxt/ui/composables'
import { createTodo, updateTodo, type NewTodoPayload, type Todo } from '#shared/api/todos'
import { todoListQuery } from '~/queries/todos'
import { useAuth } from '~/lib/use-auth'

// Optimistic pattern (https://pinia-colada.esm.dev — advanced patterns):
// onMutate: save old state, write the hoped-for state, cancel in-flight fetches
// onSuccess: swap the optimistic entry for the server row
// onError: rollback (only if nothing else touched the cache) + toast
// onSettled: invalidate so any active list refetches the truth

// fake-todo marker to spot them in UI
const OPTIMISTIC_ID_PREFIX = '#'

export function isOptimisticTodo(todo: Todo): boolean {
  return todo.id.startsWith(OPTIMISTIC_ID_PREFIX)
}

export const useCreateTodo = defineMutation(() => {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { session } = useAuth()

  return useMutation({
    mutation: (payload: NewTodoPayload) => createTodo(payload),

    onMutate({ title }) {
      const oldList = queryCache.getQueryData(todoListQuery.key)
      const newTodo: Todo = {
        // Sentinel id, replaced by the server row in onSuccess. The uuid part
        // only keeps concurrent optimistic rows distinct (`v-for` keys).
        id: OPTIMISTIC_ID_PREFIX + crypto.randomUUID(),
        title,
        completed: false,
        // Mirror what the server will do: tag with the signed-in user.
        userId: session.value?.user.id ?? null,
        createdAt: new Date().toISOString(),
      }
      // The list is newest-first.
      const newList = [newTodo, ...(oldList ?? [])]
      queryCache.setQueryData(todoListQuery.key, newList)
      queryCache.cancelQueries({ key: todoListQuery.key })
      return { oldList, newList, newTodo }
    },

    onSuccess(serverTodo, _payload, { newTodo }) {
      const list = queryCache.getQueryData(todoListQuery.key) ?? []
      const i = list.findIndex((t) => t.id === newTodo.id)
      if (i >= 0) {
        const copy = list.slice()
        copy.splice(i, 1, serverTodo)
        queryCache.setQueryData(todoListQuery.key, copy)
      }
    },

    onError(error, _payload, { oldList, newList }) {
      if (newList === queryCache.getQueryData(todoListQuery.key)) {
        queryCache.setQueryData(todoListQuery.key, oldList ?? [])
      }
      toast.add({ title: 'Could not create todo', description: error.message, color: 'error' })
    },

    onSettled() {
      queryCache.invalidateQueries({ key: todoListQuery.key })
    },
  })
})

export const useToggleTodo = defineMutation(() => {
  const queryCache = useQueryCache()
  const toast = useToast()

  return useMutation({
    mutation: (todo: Todo) => updateTodo(todo.id, { completed: !todo.completed }),

    onMutate(todo) {
      const oldList = queryCache.getQueryData(todoListQuery.key)
      const newList = oldList?.map((t) =>
        t.id === todo.id ? { ...t, completed: !t.completed } : t,
      )
      if (newList) {
        queryCache.setQueryData(todoListQuery.key, newList)
        queryCache.cancelQueries({ key: todoListQuery.key })
      }
      return { oldList, newList }
    },

    onSuccess(serverTodo) {
      const list = queryCache.getQueryData(todoListQuery.key)
      if (list) {
        queryCache.setQueryData(
          todoListQuery.key,
          list.map((t) => (t.id === serverTodo.id ? serverTodo : t)),
        )
      }
    },

    onError(error, _todo, { oldList, newList }) {
      if (newList && newList === queryCache.getQueryData(todoListQuery.key)) {
        queryCache.setQueryData(todoListQuery.key, oldList!)
      }
      toast.add({ title: 'Could not update todo', description: error.message, color: 'error' })
    },

    onSettled() {
      queryCache.invalidateQueries({ key: todoListQuery.key })
    },
  })
})
