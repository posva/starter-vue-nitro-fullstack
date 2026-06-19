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
- [x] **Transactional email**. Implemented in `server/utils/email.ts`: a Resend
      transport over `fetch` (no SDK), used when `RESEND_API_KEY` is set,
      otherwise the link is logged to the console. `sendResetPassword` and
      `sendVerificationEmail` go through it. **Prod action**: set `RESEND_API_KEY` + `EMAIL_FROM` (verified sending domain). Remaining nicety: on serverless,
      send via `waitUntil` rather than `await` (timing-attack guidance) — we
      currently await + swallow errors, which is fine but not optimal.
- [x] **Email verification enforced in prod.** `requireEmailVerification` and
      `accountLinking.requireLocalEmailVerified` are both `isProd`: enforced in
      production (secure — local accounts are verified, so social linking is
      safe), relaxed in dev (so sign-up + email-match linking work without a mail
      provider). Verification mail is sent in every env (`sendOnSignUp`), so the
      flow is testable locally via the logged link. **Requires** `RESEND_API_KEY`
      in prod or users can't verify (a startup warning fires if it's missing).

## Hardening / best practices

- [ ] **Rate limiting**. Better Auth has a built-in `rateLimit` option — enable
      and configure a store (in-memory is per-instance only; use the DB or a
      KV/Redis store on multi-instance/serverless).
- [x] **Trusted origins**. `trustedOrigins` trusts any localhost origin in dev
      (so any Vite port works) and only `baseURL` in prod. **Note**: Vercel
      preview deployments have changing URLs — `VERCEL_URL` covers the current
      one via `baseURL`, but if you hit auth across preview domains, extend the
      dev branch of `trustedOrigins` (in `server/utils/auth.ts`) to also allow
      `*.vercel.app` or your preview pattern.
- [ ] **Cookie cache** (`session.cookieCache`) to cut DB reads per request.
- [ ] **`databaseHooks`** if you need to mirror auth users into the demo `users`
      table or run side effects on user/session create.
- [ ] Review whether `trustedProviders` (links even when a provider doesn't mark
      the email verified) is acceptable for your threat model. Dropping it falls
      back to linking only on provider-verified emails — safer, but Vercel/GitHub
      email verification varies.
- [x] **`accountLinking.requireLocalEmailVerified`** is `isProd` (prod: secure
      default; dev: relaxed so linking to unverified local accounts works for
      testing). The dev path is covered by the linking test in
      `server/utils/auth.test.ts`. No action needed unless you want verification
      enforced in dev too — then make it always `true` and configure email.
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
