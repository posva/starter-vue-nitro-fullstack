import { shallowRef } from 'vue'
import { authClient, type Session } from './auth-client'

// TODO: refactor to a cleaner version that works for both server and client
// and allow deciding when we want to render client or server stuff

// Module-level shared state so every component sees the same session without a
// store library. Populated on the client only (see `refresh`), which keeps SSR
// free of network calls and avoids hydration mismatches: the server always
// renders the logged-out shell, then the client fills it in after mount.
const session = shallowRef<Session | null>(null)
const pending = shallowRef(true)
let started = false

export function useAuth() {
  async function refresh() {
    const { data } = await authClient.getSession()
    session.value = data ?? null
    pending.value = false
  }

  // Kick off the first fetch lazily, once, on the client.
  if (!started && !import.meta.env.SSR) {
    started = true
    refresh()
  }

  return { session, pending, refresh }
}
