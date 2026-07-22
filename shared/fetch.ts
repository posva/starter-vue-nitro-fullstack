import { serverFetch } from 'nitro'

export const fetch = import.meta.env.SSR ? serverFetch : globalThis.fetch
