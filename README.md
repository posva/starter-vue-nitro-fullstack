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

| Variable | Source | Notes |
| --- | --- | --- |
| `DATABASE_URL` | **Neon integration** (auto) | Postgres connection string. Created — together with the `POSTGRES_*`, `PG*`, and `NEON_*` variables — when you install the Neon integration (see below). The app only reads `DATABASE_URL`; the build runs `pnpm db:migrate` against it. |
| `BETTER_AUTH_SECRET` | manual ✅ | Session secret. Generate with `openssl rand -base64 32`. Falls back to a known insecure dev value if unset. |
| `BETTER_AUTH_URL` | manual ✅ | Public origin of the app, e.g. `https://your-app.com`. Passkeys, cookies, and **all OAuth redirects** are bound to it. If unset it falls back to the *per-deployment* `VERCEL_URL`, which changes every deploy and breaks OAuth callbacks — so set it to your stable domain. |
| `RESEND_API_KEY` + `EMAIL_FROM` | manual ✅ | [Resend](https://resend.com) credentials for verification + password-reset email. Production requires a verified email to sign in, so **email/password users can't log in without these**. `EMAIL_FROM` must be on a verified sending domain. |
| `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` | manual (optional) | Enables GitHub sign-in (both must be set). |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | manual (optional) | Enables Google sign-in (both must be set). |
| `OAUTH_VERCEL_CLIENT_ID` + `OAUTH_VERCEL_CLIENT_SECRET` | manual (optional) | Enables Sign in with Vercel (both must be set). See below. |

Each social provider only registers when **both** of its variables are present, so the app boots fine with none configured. The callback/redirect URL for any provider is:

```
<BETTER_AUTH_URL>/api/auth/callback/<provider>
```

## Deploying to Vercel

Connect the repo to a Vercel project, then do the steps below. The build command (`vercel.json`) is `pnpm db:migrate && pnpm build`, so migrations run against `DATABASE_URL` on every deploy.

> Most of the work is **installing the Neon integration** — it provisions the database variables for you. Everything else is a handful of secrets you set by hand. Local `.env` files are never uploaded, so all of this lives on the Vercel project. Environment variable changes only take effect on the **next deployment**, so redeploy after changing them.

### 1. Database — install the Neon integration

This is the real database setup: the integration provisions `DATABASE_URL` (plus the `POSTGRES_*` / `PG*` / `NEON_*` variables) on the project automatically.

```bash
vercel install neon
# or, to skip prompts:
vercel install neon --name my-database --plan free -e production -e preview
```

<details>
<summary>Set it up in the Vercel dashboard instead</summary>

1. Open your project → **Storage** (or **Integrations** → **Browse Marketplace**).
2. Pick **Neon** → **Add Integration** / **Create**.
3. Choose a database name, region, and plan, then **connect it to this project**.
4. Vercel writes `DATABASE_URL` and the related `POSTGRES_*` / `PG*` / `NEON_*` variables into the project's environment automatically.

</details>

### 2. Auth + email secrets (set by hand)

These are not provisioned by any integration:

```bash
vercel env add BETTER_AUTH_SECRET production   # openssl rand -base64 32
vercel env add BETTER_AUTH_URL production       # https://your-app.com (your stable domain)
vercel env add RESEND_API_KEY production
vercel env add EMAIL_FROM production            # you@your-verified-domain.com
```

<details>
<summary>Set them up in the Vercel dashboard instead</summary>

Project → **Settings** → **Environment Variables** → add each `KEY` / value with the **Production** environment checked (also tick **Preview** if you deploy preview branches), then **Save**.

</details>

### 3. Social sign-in (optional)

Add a provider's two variables to light it up (`GITHUB_*`, `GOOGLE_*`, `OAUTH_VERCEL_*`). Each provider's redirect URL is `<BETTER_AUTH_URL>/api/auth/callback/<provider>`.

#### Sign in with Vercel

These credentials are **not** injected automatically — you create a Vercel App and supply them yourself. Better Auth handles the OAuth flow and the PKCE that Vercel requires; you only provide the credentials and redirect URL.

```bash
# Create the App (skip if you already have one) — returns a Client ID + Secret:
vercel oauth-apps register --name "My App" --slug my-app \
  --redirect-uri https://your-app.com/api/auth/callback/vercel

# Store the credentials it returned:
vercel env add OAUTH_VERCEL_CLIENT_ID production
vercel env add OAUTH_VERCEL_CLIENT_SECRET production
```

The App's redirect URL must be `<BETTER_AUTH_URL>/api/auth/callback/vercel` and match `BETTER_AUTH_URL`'s origin exactly.

<details>
<summary>Set it up in the Vercel dashboard instead</summary>

1. Go to your team's **Settings** → **Sign in with Vercel** (see [Manage Sign in with Vercel](https://vercel.com/docs/sign-in-with-vercel/manage-from-dashboard)).
2. **Create an App**, and set its redirect URL to `<BETTER_AUTH_URL>/api/auth/callback/vercel`.
3. Copy the generated **Client ID** and **Client Secret**.
4. Add them to the project as `OAUTH_VERCEL_CLIENT_ID` and `OAUTH_VERCEL_CLIENT_SECRET` (Settings → Environment Variables, Production).

</details>

> ⚠️ **Why `OAUTH_VERCEL_*` and not `VERCEL_CLIENT_ID`?** Vercel reserves the `VERCEL_` prefix for its own system variables and **rejects** custom env vars using it. Better Auth's docs suggest `VERCEL_CLIENT_ID` / `VERCEL_CLIENT_SECRET`, but those names can't be added to a Vercel project — hence the `OAUTH_VERCEL_*` names used here (see `server/utils/auth.ts`).

See also: [Better Auth — Vercel provider](https://better-auth.com/docs/authentication/vercel) and [Sign in with Vercel — Getting started](https://vercel.com/docs/sign-in-with-vercel/getting-started).
