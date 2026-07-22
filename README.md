# starter-vue-nitro-fullstack

> Fullstack Vue starter where you pick your own stack.

Built on [Nitro v3](https://nitro.build)'s Vite integration. The demo deploys to Vercel, but nothing ties you to it: Nitro builds for [any provider or runtime](https://nitro.build/deploy) by changing a preset, and every other piece can be swapped too. Keep what you like, replace what you don't.

## What's inside

- **Server**: [Nitro v3](https://nitro.build) with API routes in `server/`. Deploy presets exist for pretty much every host.
- **Frontend**: Vue 3 SSR + Vue Router with file-based routes and data loaders.
- **UI**: [Nuxt UI](https://ui.nuxt.com) v4 on Tailwind CSS v4.
- **State & data fetching**: [Pinia](https://pinia.vuejs.org) + [Pinia Colada](https://pinia-colada.esm.dev).
- **Auth**: [Better Auth](https://better-auth.com) with email/password, social sign-in (GitHub, Google, Vercel), and passkeys.
- **Database**: Postgres with raw SQL over [db0](https://db0.unjs.io). [PGlite](https://pglite.dev) locally, any Postgres in production. No ORM, see below.
- **Email**: [Resend](https://resend.com) for verification and password reset. Logged to the console in dev.
- **Head & SEO**: [`@unhead/vue`](https://unhead.unjs.io).

### No ORM, on purpose

The database layer is plain SQL migrations and queries, so the template doesn't lock you into an ORM. That said, IMHO you should use one for a real app: typed schema, generated migrations, less room for mistakes. [Drizzle](https://orm.drizzle.team) is a solid default, and [`docs/database/00.init-db.md`](./docs/database/00.init-db.md) has a ready-made prompt that migrates the whole layer to it.

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

Everything is documented in [`.env.example`](./.env.example). Nothing is required for local dev; the table below is what matters **in production**. The **Source** column shows what sets each one: on Vercel, the Neon and Resend integrations set the database and email variables for you, the rest are set by hand. On other hosts you set them all by hand.

| Variable                                                | Source                        | Notes                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                                          | **Neon integration** (auto)   | Postgres connection string. Created (together with the `POSTGRES_*`, `PG*`, and `NEON_*` variables) when you install the Neon integration (see [`docs/deploy-vercel.md`](./docs/deploy-vercel.md)). The app only reads `DATABASE_URL`; the build runs `pnpm db:migrate` against it.                                                              |
| `BETTER_AUTH_SECRET`                                    | manual ✅                     | Session secret. Generate with `openssl rand -base64 32`. Falls back to a known insecure dev value if unset.                                                                                                                                                                                                                                      |
| `BETTER_AUTH_URL`                                       | manual ✅ (prod only)         | Public origin, e.g. `https://your-app.com`. Passkeys, cookies, and OAuth redirects bind to it. Set on **Production** to your stable domain; **leave unset on Preview** (see [Preview deployments](./docs/deploy-vercel.md#preview-deployments)).                                                                                                 |
| `RESEND_API_KEY` + `EMAIL_FROM`                         | **Resend integration** (auto) | [Resend](https://resend.com) credentials for verification + password-reset email. Production requires a verified email to sign in, so **email/password users can't log in without these**. The integration also sets `RESEND_EMAIL_DOMAIN`, which the app doesn't read. Setting them by hand? `EMAIL_FROM` must be on a verified sending domain. |
| `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`             | manual (optional)             | Enables GitHub sign-in (both must be set).                                                                                                                                                                                                                                                                                                       |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`             | manual (optional)             | Enables Google sign-in (both must be set).                                                                                                                                                                                                                                                                                                       |
| `OAUTH_VERCEL_CLIENT_ID` + `OAUTH_VERCEL_CLIENT_SECRET` | manual (optional)             | Enables Sign in with Vercel (both must be set). See [Sign in with Vercel](./docs/deploy-vercel.md#sign-in-with-vercel).                                                                                                                                                                                                                          |

Each social provider only registers when **both** of its variables are present, so the app boots fine with none configured. The callback/redirect URL for any provider is:

```
<origin>/api/auth/callback/<provider>
```

where `<origin>` is `BETTER_AUTH_URL` in production and the live preview URL on previews.

## Deploying

The demo runs on Vercel: see [`docs/deploy-vercel.md`](./docs/deploy-vercel.md). Install the Neon and Resend integrations for the database and email, set the auth secrets by hand, optionally enable social sign-in. It also covers how auth works on preview deployments with no extra URL config.

Deploying elsewhere? Nitro has [presets](https://nitro.build/deploy) for Cloudflare, Netlify, Deno, Bun, plain Node, and more. The database only needs a Postgres `DATABASE_URL` (or swap the db0 connector for another engine, see [`docs/database/00.init-db.md`](./docs/database/00.init-db.md)).
