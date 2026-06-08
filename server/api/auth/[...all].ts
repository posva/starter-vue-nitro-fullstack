import { fromWebHandler } from 'nitro/h3'
import { useAuth } from '../../utils/auth'

// Catch-all for Better Auth: handles every /api/auth/* request (sign-in,
// sign-up, OAuth callbacks, passkey ceremonies, session, …) for all methods.
// Better Auth speaks the web Fetch (Request -> Response) protocol, which
// `fromWebHandler` adapts into an h3 event handler.
export default fromWebHandler(async (request) => {
  const auth = await useAuth()
  return auth.handler(request)
})
