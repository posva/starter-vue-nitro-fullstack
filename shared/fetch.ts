import { fetch as nitroFetch } from 'nitro'

export const fetch = import.meta.env.SSR ? nitroFetch : globalThis.fetch
