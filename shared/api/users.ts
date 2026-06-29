import { fetch } from '#shared/fetch'
import { mande } from 'mande'

export const users = mande('/api/users', {}, fetch)
