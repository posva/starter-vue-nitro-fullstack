import { defineQueryOptions } from '@pinia/colada'
import { users } from '#shared/api/users'

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export const USER_QUERY_KEYS = {
  root: ['users'] as const,
  byId: (id: string) => [...USER_QUERY_KEYS.root, id] as const,
}

export const userListQuery = defineQueryOptions({
  key: USER_QUERY_KEYS.root,
  query: () => users.get<User[]>('/'),
})
