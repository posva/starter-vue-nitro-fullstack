import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { passkey } from '@better-auth/passkey'
import { useDrizzle, tables } from './drizzle'
import { sendEmail, isEmailConfigured } from './email'

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

  const isProd = process.env.NODE_ENV === 'production'

  // In prod we require a verified email to sign in — that only works if a mail
  // provider can actually send the verification link. Fail loud on misconfig.
  if (isProd && !isEmailConfigured()) {
    console.warn(
      '[auth] Production requires email verification but no email provider is configured ' +
        '(set RESEND_API_KEY + EMAIL_FROM). Email/password users will be unable to verify and sign in.',
    )
  }

  return {
    baseURL: appUrl,
    // A stable secret keeps sessions valid across restarts. MUST be overridden
    // in production via BETTER_AUTH_SECRET (`openssl rand -base64 32`).
    secret: process.env.BETTER_AUTH_SECRET || 'dev-only-insecure-secret-change-me-0123456789',

    // CSRF origin allow-list. Better Auth always trusts `baseURL`.
    // In dev, trust whatever local origin the request actually came from — any
    // port AND any `*.localhost` subdomain (e.g. https://vue-nitro.localhost),
    // any scheme — so it works with no config. In production nothing extra is
    // trusted (only `baseURL`), so cross-origin authenticated requests stay
    // blocked.
    // NOTE: Better Auth also calls this once with no request (to seed the static
    // list), so `request` may be undefined.
    trustedOrigins: (request?: Request) => {
      if (isProd) return []
      const origin = request?.headers.get('origin')
      if (!origin) return []
      try {
        const { hostname } = new URL(origin)
        const isLocal =
          hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')
        if (isLocal) return [origin]
      } catch {
        // ignore malformed Origin headers
      }
      return []
    },

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
      // Require a verified email before sign-in in production; keep it off in dev
      // so local sign-up works without an email provider. Verification emails are
      // still sent in every env (see `emailVerification.sendOnSignUp`), so you can
      // exercise the full flow locally by clicking the link logged to the console.
      requireEmailVerification: isProd,
      sendResetPassword: async ({ user, url }) => {
        try {
          await sendEmail({
            to: user.email,
            subject: 'Reset your password',
            text: `Reset your password:\n\n${url}\n\nIf you didn't request this, ignore this email.`,
          })
        } catch (err) {
          // Don't fail the request (and don't leak success/failure) on a send error.
          console.error('[auth] failed to send reset email', err)
        }
      },
    },

    emailVerification: {
      // Send a verification email as soon as someone signs up.
      sendOnSignUp: true,
      // Clicking the link signs them in, so they land verified.
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        try {
          await sendEmail({
            to: user.email,
            subject: 'Verify your email',
            text: `Confirm your email address:\n\n${url}`,
          })
        } catch (err) {
          console.error('[auth] failed to send verification email', err)
        }
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
        // Whether the *existing local* account must already be email-verified
        // before a social login may link into it (Better Auth's default is
        // `true`; an unmet requirement throws `account_not_linked`).
        //   - prod: true  → secure. Local accounts are verified (verification is
        //     required), so linking is safe and an attacker can't pre-register
        //     an email they don't own to capture someone's social login.
        //   - dev:  false → local accounts are unverified (no email provider),
        //     so relax it to make email-match linking testable.
        requireLocalEmailVerified: isProd,
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
