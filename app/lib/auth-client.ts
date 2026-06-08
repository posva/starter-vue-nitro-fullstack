import { createAuthClient } from 'better-auth/vue'
import { passkeyClient } from '@better-auth/passkey/client'

// Same-origin: the auth server is mounted at /api/auth in this app, so no
// baseURL is needed. The passkey client plugin adds `authClient.passkey.*` and
// `authClient.signIn.passkey`.
export const authClient = createAuthClient({
  plugins: [passkeyClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient

export type Session = typeof authClient.$Infer.Session
