import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { passkey } from '@better-auth/passkey'
import { useDrizzle, tables } from './drizzle'

export type Auth = ReturnType<typeof betterAuth>

let _auth: Auth | undefined

/**
 * Lazily build (and cache) the Better Auth instance.
 *
 * The drizzle adapter needs a concrete db handle, but `useDrizzle()` is async
 * (it dynamically imports PGlite or Neon on first use), so the auth instance is
 * created on first request and memoized for the rest of the process lifetime.
 */
export async function useAuth(): Promise<Auth> {
  if (_auth) return _auth
  const db = await useDrizzle()
  _auth = betterAuth(authOptions(db))
  return _auth
}

// Accept any Drizzle DB the adapter supports (Neon in prod, PGlite in dev/tests)
// rather than pinning to one backend's type.
type DrizzleDB = Parameters<typeof drizzleAdapter>[0]

export function authOptions(db: DrizzleDB): BetterAuthOptions {
  // Single source of truth for the public origin, in priority order:
  //   1. BETTER_AUTH_URL — explicit (set this for a stable production domain)
  //   2. VERCEL_URL — auto-injected per deployment, so previews work out of the box
  //   3. localhost — local dev
  // Passkeys are bound to this origin, so it must match the URL the browser uses.
  const appUrl =
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    'http://localhost:3000'
  const { hostname, origin } = new URL(appUrl)

  return {
    baseURL: appUrl,
    // A stable secret keeps sessions valid across restarts. MUST be overridden
    // in production via BETTER_AUTH_SECRET (`openssl rand -base64 32`).
    secret: process.env.BETTER_AUTH_SECRET || 'dev-only-insecure-secret-change-me-0123456789',

    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: tables.user,
        session: tables.session,
        account: tables.account,
        verification: tables.verification,
        passkey: tables.passkey,
      },
    }),

    emailAndPassword: {
      enabled: true,
      // Verification needs a transactional email provider, which isn't wired up
      // yet — keep it off so local sign-up works out of the box. Flip to `true`
      // once `emailVerification.sendVerificationEmail` actually sends mail.
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        // TODO: send a real email. Logged for now so the flow is testable.
        console.warn(`[auth] password reset for ${user.email}: ${url}`)
      },
    },

    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        // TODO: send a real email. Logged for now so the flow is testable.
        console.warn(`[auth] verify email for ${user.email}: ${url}`)
      },
    },

    socialProviders: socialProviders(),

    account: {
      accountLinking: {
        // The crux of the requirement: signing in through any of these
        // providers links to an existing account with the same email instead
        // of creating a duplicate. Listing them as trusted also links accounts
        // whose email a provider doesn't explicitly mark verified.
        enabled: true,
        trustedProviders: ['google', 'github', 'vercel'],
      },
    },

    plugins: [
      passkey({
        rpID: hostname,
        rpName: 'Vue Nitro Fullstack',
        origin,
      }),
    ],
  }
}

/**
 * Register a social provider only when both of its credentials are present, so
 * the server boots fine before any OAuth app is configured. Wire the env vars
 * (see `.env.example`) to light each one up — no code change needed.
 */
function socialProviders(): BetterAuthOptions['socialProviders'] {
  const providers: NonNullable<BetterAuthOptions['socialProviders']> = {}

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }
  }

  if (process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET) {
    providers.vercel = {
      clientId: process.env.VERCEL_CLIENT_ID,
      clientSecret: process.env.VERCEL_CLIENT_SECRET,
    }
  }

  return providers
}

/** Which social providers are currently configured — surfaced to the client. */
export function enabledSocialProviders(): string[] {
  return Object.keys(socialProviders() ?? {})
}
