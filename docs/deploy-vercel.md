# Deploying to Vercel

Connect the repo to a Vercel project, then do the steps below. Set the **Build Command** in Project Settings → Build and Deployment to `pnpm db:migrate && pnpm build`, so migrations run against `DATABASE_URL` before every deploy's build.

> Most of the work is **installing the Neon and Resend integrations**: they create the database and email variables for you. Everything else is a couple of secrets you set by hand. Local `.env` files are never uploaded, so all of this lives on the Vercel project. Environment variable changes only take effect on the **next deployment**, so redeploy after changing them.

All the variables referenced below are documented in the [Environment variables](../README.md#environment-variables) table in the README.

## 1. Database: install the Neon integration

This is the real database setup: the integration creates `DATABASE_URL` (plus the `POSTGRES_*` / `PG*` / `NEON_*` variables) on the project automatically. For the database stack, migrations, and per-deployment branches, see [`docs/database/`](./database/00.init-db.md).

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

## 2. Email: install the Resend integration

Same idea as Neon: the integration creates `RESEND_API_KEY`, `RESEND_EMAIL_DOMAIN`, and `EMAIL_FROM` on the project for you. The app only reads `RESEND_API_KEY` and `EMAIL_FROM`.

```bash
vercel install resend
```

<details>
<summary>Set it up in the Vercel dashboard instead</summary>

1. Open your project → **Storage** (or **Integrations** → **Browse Marketplace**).
2. Pick **Resend** → **Add Integration** / **Create**, then connect it to this project.
3. Verify your sending domain in Resend so `EMAIL_FROM` can actually send.

</details>

On other hosts there's no integration: create an API key and verify a sending domain at [resend.com](https://resend.com), then set `RESEND_API_KEY` and `EMAIL_FROM` by hand (`EMAIL_FROM` must be on the verified domain).

## 3. Auth secrets (set by hand)

These are not created by any integration:

```bash
vercel env add BETTER_AUTH_SECRET production   # openssl rand -base64 32
vercel env add BETTER_AUTH_URL production      # https://your-app.com (your stable domain)
```

For preview deployments, add `BETTER_AUTH_SECRET` to the `preview` environment too, but **not `BETTER_AUTH_URL`** (see [Preview deployments](#preview-deployments)):

```bash
vercel env add BETTER_AUTH_SECRET preview      # can reuse the production value
```

<details>
<summary>Set them up in the Vercel dashboard instead</summary>

Project → **Settings** → **Environment Variables** → add each `KEY` / value with **Production** checked (also tick **Preview** for `BETTER_AUTH_SECRET`, never for `BETTER_AUTH_URL`), then **Save**.

</details>

## 4. Social sign-in (optional)

Add a provider's two variables to light it up (`GITHUB_*`, `GOOGLE_*`, `OAUTH_VERCEL_*`). Each provider's redirect URL is `<BETTER_AUTH_URL>/api/auth/callback/<provider>`.

### Sign in with Vercel

These credentials are **not** injected automatically: you create a Vercel App and supply them yourself. Better Auth handles the OAuth flow and the PKCE that Vercel requires; you only provide the credentials and redirect URL.

```bash
# Create the App (skip if you already have one); it returns a Client ID + Secret:
vercel oauth-apps register --name "My App" --slug my-app \
  --redirect-uri https://your-app.com/api/auth/callback/vercel

# Store the credentials it returned (add to preview too to enable it on previews):
vercel env add OAUTH_VERCEL_CLIENT_ID production
vercel env add OAUTH_VERCEL_CLIENT_SECRET production
vercel env add OAUTH_VERCEL_CLIENT_ID preview
vercel env add OAUTH_VERCEL_CLIENT_SECRET preview
```

The App's redirect URL must match `BETTER_AUTH_URL`'s origin exactly. To also cover preview deployments, register the callback by **selecting your Vercel project** rather than a fixed domain (see [Preview deployments](#preview-deployments)).

<details>
<summary>Set it up in the Vercel dashboard instead</summary>

1. Go to your team's **Settings** → **Sign in with Vercel** (see [Manage Sign in with Vercel](https://vercel.com/docs/sign-in-with-vercel/manage-from-dashboard)).
2. **Create an App**. For the callback, **select your Vercel project** from the dropdown (covers production _and_ all preview domains); the path is `/api/auth/callback/vercel`.
3. Copy the generated **Client ID** and **Client Secret**.
4. Add them to the project as `OAUTH_VERCEL_CLIENT_ID` and `OAUTH_VERCEL_CLIENT_SECRET` (Settings → Environment Variables, with **Production** and **Preview** checked).

</details>

> ⚠️ **Why `OAUTH_VERCEL_*` and not `VERCEL_CLIENT_ID`?** Vercel reserves the `VERCEL_` prefix for its own system variables and **rejects** custom env vars using it. Better Auth's docs suggest `VERCEL_CLIENT_ID` / `VERCEL_CLIENT_SECRET`, but those names can't be added to a Vercel project, so this template uses `OAUTH_VERCEL_*` instead (see `server/utils/auth.ts`).

See also: [Better Auth: Vercel provider](https://better-auth.com/docs/authentication/vercel) and [Sign in with Vercel: Getting started](https://vercel.com/docs/sign-in-with-vercel/getting-started).

## Preview deployments

Auth works on previews with no extra URL config: the app resolves its public origin per request from Vercel's injected URLs, so cookies and OAuth redirects track whichever rotating preview URL you open (see `server/utils/auth.ts`).

To enable it, connect the Neon and Resend integrations to the **Preview** environment (they cover it by default) and add `BETTER_AUTH_SECRET` to Preview, with one rule: **never set `BETTER_AUTH_URL` on Preview**. Leaving it unset is what turns on per-request resolution. For Sign in with Vercel, the project-selected callback already covers every preview domain.

Two caveats: previews have **Deployment Protection** on by default (only your team can reach them), and a custom preview domain Vercel doesn't inject as an env var would need its own `BETTER_AUTH_URL`.

For per-deployment **database** branches and instant rollback, see [`docs/database/previews-and-rollback.md`](./database/previews-and-rollback.md).
