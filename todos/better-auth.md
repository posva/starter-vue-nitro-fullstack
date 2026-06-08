# Better Auth — remaining work

What's wired up and what still needs doing to be production-ready. Items are
roughly ordered by importance.

## Done

- Email + password sign-up / sign-in (`server/utils/auth.ts`).
- Passkeys (WebAuthn) via `@better-auth/passkey` — register, list, delete, sign-in.
- Social providers: GitHub, Google, Vercel — registered only when their env vars
  are set, so the app boots with none configured.
- **Account linking by matching email** (the key requirement): enabled with
  `trustedProviders: ['google','github','vercel']`. Signing in through any of
  them with an email that already exists links to that account instead of
  duplicating it.
- Catch-all handler at `/api/auth/*`, lazy/memoized auth instance over the
  existing Drizzle (PGlite dev / Neon prod) setup.
- Drizzle schema + migration for `user`, `session`, `account`, `verification`,
  `passkey`.
- Integration test (`server/utils/auth.test.ts`) covering the real schema +
  adapter + email/password flow against in-memory PGlite.

## Required before production

- [ ] **Set env vars** (see `.env.example`): `BETTER_AUTH_SECRET` (mandatory —
      `openssl rand -base64 32`), `BETTER_AUTH_URL`, and the OAuth client
      id/secret pairs. Register the callback URL
      `<BETTER_AUTH_URL>/api/auth/callback/<provider>` in each provider console.
- [ ] **Transactional email**. `sendResetPassword` and `sendVerificationEmail`
      currently only `console.warn` the link. Wire a real provider (Resend,
      Postmark, SES…). On serverless, send via `waitUntil` and don't `await` it
      (timing-attack guidance from the docs).
- [ ] **Turn on `requireEmailVerification: true`** once email sending works, so
      unverified email/password accounts can't sign in.

## Hardening / best practices

- [ ] **Rate limiting**. Better Auth has a built-in `rateLimit` option — enable
      and configure a store (in-memory is per-instance only; use the DB or a
      KV/Redis store on multi-instance/serverless).
- [ ] **Trusted origins**. Set `trustedOrigins` for CSRF protection, especially
      across Vercel preview domains.
- [ ] **Cookie cache** (`session.cookieCache`) to cut DB reads per request.
- [ ] **`databaseHooks`** if you need to mirror auth users into the demo `users`
      table or run side effects on user/session create.
- [ ] Review whether `trustedProviders` (links even when a provider doesn't mark
      the email verified) is acceptable for your threat model. Dropping it falls
      back to linking only on provider-verified emails — safer, but Vercel/GitHub
      email verification varies.
- [ ] **SSR session**: the client fetches the session after mount
      (`app/lib/use-auth.ts`). For no-flash authenticated SSR, read the session
      on the server (`auth.api.getSession({ headers })`) in `entry-server` and
      hydrate it.
- [ ] **Route protection**: `/account` redirects client-side only. Add a server
      guard if pages must never render for anonymous users.

## Testing

- [ ] **OAuth account-linking e2e**. The current test asserts linking config is
      on, but a full "sign in via GitHub with an existing email → single user,
      two accounts" test needs the OAuth provider HTTP flow mocked (intercept the
      token + userinfo endpoints). Add with `msw` or Better Auth's test helpers.
- [ ] Passkey ceremonies can't run in jsdom; cover with a real browser
      (Playwright + virtual authenticator) if you want automated coverage.
