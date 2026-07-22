# starter-vue-nitro-fullstack

> Vue + Nitro fullstack starter

WIP building up on top of [Nitro v3](https://nitro.build/examples/vite-ssr-vue-router) + other experimental stuff.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Local dev needs **no configuration**:

- The database falls back to a local [PGlite](https://pglite.dev) instance persisted at `.data/pg` (no Docker), with migrations auto-applied on dev start.
- Auth uses a built-in insecure secret, and verification/reset emails are logged to the server console instead of being sent.

So you can sign up, sign in, and exercise the full auth flow locally without setting a single env var.

## Environment variables

Everything is documented in [`.env.example`](./.env.example). Nothing is required for local dev; the table below is what matters **in production**. The **Source** column shows what sets each one — installing the Neon integration provisions the database variables for you; the rest are set by hand.

| Variable                                                | Source                      | Notes                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                          | **Neon integration** (auto) | Postgres connection string. Created — together with the `POSTGRES_*`, `PG*`, and `NEON_*` variables — when you install the Neon integration (see [`docs/deploy-vercel.md`](./docs/deploy-vercel.md)). The app only reads `DATABASE_URL`; the build runs `pnpm db:migrate` against it. |
| `BETTER_AUTH_SECRET`                                    | manual ✅                   | Session secret. Generate with `openssl rand -base64 32`. Falls back to a known insecure dev value if unset.                                                                                                                                                                           |
| `BETTER_AUTH_URL`                                       | manual ✅ (prod only)       | Public origin, e.g. `https://your-app.com`. Passkeys, cookies, and OAuth redirects bind to it. Set on **Production** to your stable domain; **leave unset on Preview** (see [Preview deployments](./docs/deploy-vercel.md#preview-deployments)).                                      |
| `RESEND_API_KEY` + `EMAIL_FROM`                         | manual ✅                   | [Resend](https://resend.com) credentials for verification + password-reset email. Production requires a verified email to sign in, so **email/password users can't log in without these**. `EMAIL_FROM` must be on a verified sending domain.                                         |
| `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`             | manual (optional)           | Enables GitHub sign-in (both must be set).                                                                                                                                                                                                                                            |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`             | manual (optional)           | Enables Google sign-in (both must be set).                                                                                                                                                                                                                                            |
| `OAUTH_VERCEL_CLIENT_ID` + `OAUTH_VERCEL_CLIENT_SECRET` | manual (optional)           | Enables Sign in with Vercel (both must be set). See [Sign in with Vercel](./docs/deploy-vercel.md#sign-in-with-vercel).                                                                                                                                                               |

Each social provider only registers when **both** of its variables are present, so the app boots fine with none configured. The callback/redirect URL for any provider is:

```
<origin>/api/auth/callback/<provider>
```

where `<origin>` is `BETTER_AUTH_URL` in production and the live preview URL on previews.

## Deploying to Vercel

See [`docs/deploy-vercel.md`](./docs/deploy-vercel.md): install the Neon integration for the database, set a handful of auth/email secrets by hand, optionally enable social sign-in — plus how auth works on preview deployments with no extra URL config.
