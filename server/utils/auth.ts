import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { passkey } from '@better-auth/passkey'
import { useAuthDatabase } from './db'
import { sendEmail, isEmailConfigured } from './email'

export type Auth = ReturnType<typeof betterAuth>

let _auth: Auth | undefined

/**
 * Lazily build (and cache) the Better Auth instance.
 *
 * Better Auth needs a concrete database handle, but `useAuthDatabase()` is
 * async (it dynamically imports PGlite or pg on first use), so the auth
 * instance is created on first request and memoized for the rest of the
 * process lifetime.
 */
export async function useAuth(): Promise<Auth> {
  if (_auth) return _auth
  _auth = betterAuth(authOptions(await useAuthDatabase()))
  return _auth
}

// A pg Pool in prod, a Kysely dialect over PGlite in dev/tests — either way
// Better Auth runs it through its built-in Kysely adapter.
export function authOptions(
  database: NonNullable<BetterAuthOptions['database']>,
): BetterAuthOptions {
  const isProd = process.env.NODE_ENV === 'production'

  // Passkeys (WebAuthn) are bound to a single, STABLE Relying Party ID: the
  // browser rejects any ceremony whose rpID isn't the effective domain it's on
  // (or a registrable suffix of it) — "RP ID … is invalid for this domain". So
  // the RP host must never be the per-deploy `VERCEL_URL`, which rotates every
  // build; the moment the browser lands on the production alias it mismatches.
  // Preview branch aliases are each their own registrable domain under the
  // `*.vercel.app` public suffix, so passkeys only work on the stable host below
  // — set BETTER_AUTH_URL to a custom domain to enable them elsewhere.
  const rpUrl =
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    'http://localhost:3000'
  const { hostname: rpID, origin: rpOrigin } = new URL(rpUrl)

  // A single Vercel build answers to several rotating hostnames — the unique
  // per-deploy `VERCEL_URL`, the stable git-branch preview alias, and the
  // project's production domain. Pinning one would make the OAuth `redirect_uri`,
  // the state cookie and the CSRF origin check land on a *different* host than
  // the browser is on (the "invalid origin" you hit on previews). Instead we
  // hand Better Auth its multi-domain config built from Vercel's *own* injected
  // URLs — so it resolves the origin per request, gated to this deployment's
  // real hosts, with zero hardcoded domains and nothing to set by hand. These
  // are also auto-added to `trustedOrigins`. See Better Auth's `DynamicBaseURLConfig`.
  const vercelHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter((h): h is string => !!h)

  // Public origin, in priority order:
  //   1. BETTER_AUTH_URL — explicit, wins everywhere (set a stable prod domain).
  //   2. Vercel — dynamic allowedHosts so every deployment alias just works.
  //   3. localhost — local dev / tests.
  const baseURL: BetterAuthOptions['baseURL'] = process.env.BETTER_AUTH_URL
    ? process.env.BETTER_AUTH_URL
    : vercelHosts.length > 0
      ? { allowedHosts: vercelHosts, protocol: 'https', fallback: `https://${vercelHosts[0]}` }
      : rpUrl

  // If neither BETTER_AUTH_URL nor VERCEL_PROJECT_PRODUCTION_URL is set in a
  // deployed env, the RP silently falls back to localhost and every passkey
  // ceremony fails with an opaque browser error. Warn instead of failing dark.
  if (isProd && rpID === 'localhost') {
    console.warn(
      '[auth] Passkey RP ID resolved to "localhost" in production — passkeys will fail. ' +
        'Set BETTER_AUTH_URL (or expose VERCEL_PROJECT_PRODUCTION_URL) to a stable domain.',
    )
  }

  // In prod we require a verified email to sign in — that only works if a mail
  // provider can actually send the verification link. Fail loud on misconfig.
  if (isProd && !isEmailConfigured()) {
    console.warn(
      '[auth] Production requires email verification but no email provider is configured ' +
        '(set RESEND_API_KEY + EMAIL_FROM). Email/password users will be unable to verify and sign in.',
    )
  }

  return {
    baseURL,
    // A stable secret keeps sessions valid across restarts. MUST be overridden
    // in production via BETTER_AUTH_SECRET (`openssl rand -base64 32`).
    secret: process.env.BETTER_AUTH_SECRET || 'dev-only-insecure-secret-change-me-0123456789',

    // CSRF origin allow-list. Better Auth always trusts `baseURL` (on Vercel
    // that's every host in the dynamic `allowedHosts` config above, so previews
    // need nothing extra here). In dev, trust whatever local origin the request
    // actually came from — any port AND any `*.localhost` subdomain (e.g.
    // https://vue-nitro.localhost), any scheme — so it works with no config. In
    // production nothing extra is trusted (only `baseURL`), so cross-origin
    // authenticated requests stay blocked.
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

    database,

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
        trustedProviders: Object.keys(SOCIAL_PROVIDER_ENV) as SocialProviderId[],
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
        rpID,
        rpName: 'Vue Nitro Fullstack',
        origin: rpOrigin,
      }),
    ],
  }
}

// The social providers we support and the env vars holding each one's
// credentials — the single source of truth for both `socialProviders()` and
// `trustedProviders`. Add a provider here (and its `.env.example` entry) to
// light it up; no other code change needed.
// NOTE: Vercel reserves the `VERCEL_` env prefix, so its creds use `OAUTH_VERCEL_*`.
const SOCIAL_PROVIDER_ENV = {
  google: { id: 'GOOGLE_CLIENT_ID', secret: 'GOOGLE_CLIENT_SECRET' },
  github: { id: 'GITHUB_CLIENT_ID', secret: 'GITHUB_CLIENT_SECRET' },
  vercel: { id: 'OAUTH_VERCEL_CLIENT_ID', secret: 'OAUTH_VERCEL_CLIENT_SECRET' },
} as const satisfies Record<string, { id: string; secret: string }>

type SocialProviderId = keyof typeof SOCIAL_PROVIDER_ENV

/**
 * Register a social provider only when both of its credentials are present, so
 * the server boots fine before any OAuth app is configured.
 */
function socialProviders(): BetterAuthOptions['socialProviders'] {
  const providers: NonNullable<BetterAuthOptions['socialProviders']> = {}
  for (const [id, env] of Object.entries(SOCIAL_PROVIDER_ENV)) {
    const clientId = process.env[env.id]
    const clientSecret = process.env[env.secret]
    if (clientId && clientSecret) {
      providers[id as SocialProviderId] = { clientId, clientSecret }
    }
  }
  return providers
}

/** Which social providers are currently configured — surfaced to the client. */
export function enabledSocialProviders(): string[] {
  return Object.keys(socialProviders() ?? {})
}
