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
