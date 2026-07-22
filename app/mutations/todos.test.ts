import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp, effectScope } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, useQueryCache, type QueryCache } from '@pinia/colada'
import { createTodo, updateTodo, type Todo } from '#shared/api/todos'
import { TODO_QUERY_KEYS } from '~/queries/todos'
import { useCreateTodo, useToggleTodo, isOptimisticTodo } from './todos.ts'

vi.mock('#shared/api/todos', () => ({
  getTodoList: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
}))

const toast = vi.hoisted(() => ({ add: vi.fn() }))
vi.mock('@nuxt/ui/composables', () => ({ useToast: () => toast }))

// Signed-in session: the optimistic row must carry the user's id, like the
// server row will.
const authSession = vi.hoisted(() => ({ value: { user: { id: 'user-1' } } }))
vi.mock('~/lib/use-auth', () => ({ useAuth: () => ({ session: authSession }) }))

// Runs a composable with app + pinia injection context, outside any component.
function withSetup<T>(composable: () => T): T {
  const app = createApp({ render: () => null })
  app.use(createPinia()).use(PiniaColada)
  let result!: T
  app.runWithContext(() => {
    effectScope(true).run(() => {
      result = composable()
    })
  })
  return result
}

// Hooks like onMutate may resolve a microtask later than the mutate call.
const flush = () => new Promise((r) => setTimeout(r))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const existing: Todo = {
  id: '5f0f5e2e-0000-4000-8000-000000000001',
  title: 'existing todo',
  completed: false,
  userId: null,
  createdAt: '2026-07-22T00:00:00.000Z',
}

function seededCache(): {
  queryCache: QueryCache
  create: ReturnType<typeof useCreateTodo>
  toggle: ReturnType<typeof useToggleTodo>
} {
  return withSetup(() => {
    const queryCache = useQueryCache()
    queryCache.setQueryData(TODO_QUERY_KEYS.root, [existing])
    return { queryCache, create: useCreateTodo(), toggle: useToggleTodo() }
  })
}

const listOf = (queryCache: QueryCache) => queryCache.getQueryData<Todo[]>(TODO_QUERY_KEYS.root)!

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCreateTodo (optimistic)', () => {
  it('prepends an optimistic todo, then swaps in the server row', async () => {
    const { queryCache, create } = seededCache()
    const { promise, resolve } = deferred<Todo>()
    vi.mocked(createTodo).mockReturnValueOnce(promise)

    const done = create.mutateAsync({ title: 'buy milk' })
    await flush()

    let list = listOf(queryCache)
    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({ title: 'buy milk', completed: false, userId: 'user-1' })
    const optimisticId = list[0]!.id
    // Sentinel id: uuids never start with '#', so pending rows are detectable.
    expect(optimisticId).toMatch(/^#/)
    expect(isOptimisticTodo(list[0]!)).toBe(true)
    expect(isOptimisticTodo(existing)).toBe(false)

    const serverTodo: Todo = {
      id: '5f0f5e2e-0000-4000-8000-000000000002',
      title: 'buy milk',
      completed: false,
      userId: 'user-1',
      createdAt: '2026-07-22T01:00:00.000Z',
    }
    resolve(serverTodo)
    await done
    await flush()

    list = listOf(queryCache)
    expect(list).toHaveLength(2)
    expect(list[0]).toEqual(serverTodo)
    expect(list.some((t) => t.id === optimisticId)).toBe(false)
  })

  it('rolls back and toasts when the server rejects', async () => {
    const { queryCache, create } = seededCache()
    vi.mocked(createTodo).mockRejectedValueOnce(new Error('boom'))

    await expect(create.mutateAsync({ title: 'buy milk' })).rejects.toThrow('boom')
    await flush()

    expect(listOf(queryCache)).toEqual([existing])
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })
})

describe('useToggleTodo (optimistic)', () => {
  it('flips completed in cache immediately, then merges the server row', async () => {
    const { queryCache, toggle } = seededCache()
    const { promise, resolve } = deferred<Todo>()
    vi.mocked(updateTodo).mockReturnValueOnce(promise)

    const done = toggle.mutateAsync(existing)
    await flush()

    expect(listOf(queryCache)[0]).toMatchObject({ id: existing.id, completed: true })
    expect(updateTodo).toHaveBeenCalledWith(existing.id, { completed: true })

    resolve({ ...existing, completed: true })
    await done
    await flush()

    expect(listOf(queryCache)[0]).toEqual({ ...existing, completed: true })
  })

  it('rolls back and toasts when the server rejects', async () => {
    const { queryCache, toggle } = seededCache()
    vi.mocked(updateTodo).mockRejectedValueOnce(new Error('boom'))

    await expect(toggle.mutateAsync(existing)).rejects.toThrow('boom')
    await flush()

    expect(listOf(queryCache)[0]).toEqual(existing)
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })
})
