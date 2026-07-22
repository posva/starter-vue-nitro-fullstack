import { fetch } from '#shared/fetch'
import { mande } from 'mande'

export interface Todo {
  id: string
  title: string
  completed: boolean
  userId: string | null
  createdAt: string
}

export interface NewTodoPayload {
  title: string
}

const todos = mande('/api/todos', {}, fetch)

export function getTodoList() {
  return todos.get<Todo[]>('/')
}

export function createTodo(payload: NewTodoPayload) {
  return todos.post<Todo>(payload)
}

export interface TodoPatch {
  completed?: boolean
}

export function updateTodo(id: string, patch: TodoPatch) {
  return todos.patch<Todo>(id, patch)
}
