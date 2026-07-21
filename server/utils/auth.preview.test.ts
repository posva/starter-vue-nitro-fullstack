import { test, expect, afterEach, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { pgliteDialect } from './pglite-dialect'
import { authOptions, passkeysEnabledForHost } from './auth'

// `authOptions` reads process.env at call time, so each case mutates the env and
// restores it afterwards. A dummy in-memory PGlite dialect is enough — building
// the options object never touches the database.
const db = { dialect: pgliteDialect(new PGlite()), type: 'postgres' } as const

const ENV_KEYS = [
  'VERCEL',
  'VERCEL_ENV',
  'VERCEL_URL',
  'VERCEL_BRANCH_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'BETTER_AUTH_URL',
  'NODE_ENV',
  'RESEND_API_KEY',
] as const
const snapshot = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]))

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (snapshot[k] === undefined) delete process.env[k]
    else process.env[k] = snapshot[k]
  }
})

function setEnv(env: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

// The passkey (WebAuthn) Relying Party config is pinned to a single stable
// host — reach into the plugin to read what it resolved to.
function passkeyRp(): { rpID?: string; origin?: string } {
  const plugin = authOptions(db).plugins?.find((p) => p.id === 'passkey') as
    | { options?: { rpID?: string; origin?: string } }
    | undefined
  if (!plugin) throw new Error('passkey plugin not registered')
  return { rpID: plugin.options?.rpID, origin: plugin.options?.origin }
}

// On Vercel a single build serves several rotating hostnames (the unique
// per-deploy URL, the git-branch preview alias, the production domain). Rather
// than pinning one, we hand Better Auth its multi-domain `{ allowedHosts }`
// config built from Vercel's *own* injected URLs — it then resolves the origin
// per request and trusts those hosts. No hardcoded domain, no manual env var.
test('on Vercel, baseURL is a dynamic allowedHosts config built from injected URLs', () => {
  setEnv({
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    NODE_ENV: 'production',
    VERCEL_URL: 'app-abc123-posva.vercel.app',
    VERCEL_BRANCH_URL: 'app-git-feat-posva.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: 'app.example.com',
    BETTER_AUTH_URL: undefined,
    RESEND_API_KEY: 'test-key', // silence the prod "no email provider" warning
  })

  const { baseURL } = authOptions(db)
  expect(typeof baseURL).toBe('object')
  if (typeof baseURL !== 'object') throw new Error('unreachable')
  // Every hostname Vercel told us this deployment answers to is allowed — the
  // per-deploy URL, the branch alias, and the production domain.
  expect(baseURL.allowedHosts).toEqual([
    'app-abc123-posva.vercel.app',
    'app-git-feat-posva.vercel.app',
    'app.example.com',
  ])
  // A fallback is required for request-less calls (e.g. server-side auth.api).
  expect(baseURL.fallback).toBeTruthy()
})

test('preview domains are NOT assumed to be *.vercel.app — a custom preview host works', () => {
  // The whole point of sourcing from VERCEL_BRANCH_URL: if previews are served
  // on a custom domain, that domain flows straight into allowedHosts.
  setEnv({
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    NODE_ENV: 'production',
    VERCEL_URL: 'app-abc123-posva.vercel.app',
    VERCEL_BRANCH_URL: 'preview.my-custom-domain.dev',
    BETTER_AUTH_URL: undefined,
    RESEND_API_KEY: 'test-key',
  })

  const { baseURL } = authOptions(db)
  if (typeof baseURL !== 'object') throw new Error('expected dynamic baseURL config')
  expect(baseURL.allowedHosts).toContain('preview.my-custom-domain.dev')
})

test('explicit BETTER_AUTH_URL always wins, even on Vercel', () => {
  setEnv({
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    NODE_ENV: 'production',
    VERCEL_URL: 'app-abc123-posva.vercel.app',
    BETTER_AUTH_URL: 'https://stable.example.com',
    RESEND_API_KEY: 'test-key',
  })

  expect(authOptions(db).baseURL).toBe('https://stable.example.com')
})

test('off Vercel (local dev / tests): plain localhost origin, no dynamic config', () => {
  setEnv({
    VERCEL: undefined,
    VERCEL_ENV: undefined,
    VERCEL_URL: undefined,
    BETTER_AUTH_URL: undefined,
    NODE_ENV: 'test',
  })

  expect(authOptions(db).baseURL).toBe('http://localhost:3000')
})

// Passkeys need ONE stable Relying Party ID. The per-deploy `VERCEL_URL`
// rotates every build, so binding the RP to it makes registration fail the
// moment the browser lands on any other alias ("RP ID … is invalid for this
// domain"). The RP must instead pin to the stable production host.
test('passkey RP pins to the stable production host, NOT the rotating VERCEL_URL', () => {
  setEnv({
    VERCEL: '1',
    VERCEL_ENV: 'production',
    NODE_ENV: 'production',
    VERCEL_URL: 'app-etf0voy3t-posva.vercel.app', // per-deploy, rotates
    VERCEL_BRANCH_URL: 'app-git-main-posva.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: 'app.example.com', // stable
    BETTER_AUTH_URL: undefined,
    RESEND_API_KEY: 'test-key',
  })

  expect(passkeyRp()).toEqual({ rpID: 'app.example.com', origin: 'https://app.example.com' })
})

test('explicit BETTER_AUTH_URL wins for the passkey RP too', () => {
  setEnv({
    VERCEL: '1',
    VERCEL_ENV: 'production',
    NODE_ENV: 'production',
    VERCEL_URL: 'app-etf0voy3t-posva.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: 'app.example.com',
    BETTER_AUTH_URL: 'https://stable.example.com',
    RESEND_API_KEY: 'test-key',
  })

  expect(passkeyRp()).toEqual({ rpID: 'stable.example.com', origin: 'https://stable.example.com' })
})

// Degraded deploy: system env vars not exposed, so no stable host is known.
// The RP falls back to localhost (and `authOptions` warns) rather than binding
// to the rotating VERCEL_URL — a mismatched-but-stable failure beats silently
// half-reintroducing the original bug.
test('deployed without a stable host: passkey RP falls back to localhost, does NOT use VERCEL_URL', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  setEnv({
    VERCEL: '1',
    VERCEL_ENV: 'production',
    NODE_ENV: 'production',
    VERCEL_URL: 'app-etf0voy3t-posva.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
    BETTER_AUTH_URL: undefined,
    RESEND_API_KEY: 'test-key',
  })

  expect(passkeyRp()).toEqual({ rpID: 'localhost', origin: 'http://localhost:3000' })
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('resolved to "localhost"'))
  warn.mockRestore()
})

// The UI hides/explains the passkey affordance on hosts that can't run the
// ceremony. `passkeysEnabledForHost` is that gate: it's true only when the
// browser's host matches the RP ID (or is a subdomain of it).
test('passkeysEnabledForHost: true on the production host, false on preview aliases', () => {
  setEnv({
    VERCEL: '1',
    VERCEL_ENV: 'production',
    NODE_ENV: 'production',
    VERCEL_URL: 'app-etf0voy3t-posva.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: 'app.example.com',
    BETTER_AUTH_URL: undefined,
    RESEND_API_KEY: 'test-key',
  })

  expect(passkeysEnabledForHost('app.example.com')).toBe(true)
  // A subdomain of the RP ID is a registrable suffix → allowed by WebAuthn.
  expect(passkeysEnabledForHost('www.app.example.com')).toBe(true)
  // The rotating per-deploy alias is a different registrable domain → blocked.
  expect(passkeysEnabledForHost('app-etf0voy3t-posva.vercel.app')).toBe(false)
  expect(passkeysEnabledForHost('app-git-feat-posva.vercel.app')).toBe(false)
  // A host that merely ends with the string but isn't a subdomain must NOT match
  // (the leading dot in the suffix check guards against `evil-app.example.com`).
  expect(passkeysEnabledForHost('evil-app.example.com')).toBe(false)
  expect(passkeysEnabledForHost('')).toBe(false)
  expect(passkeysEnabledForHost(null)).toBe(false)
})

test('passkeysEnabledForHost: localhost dev matches regardless of port', () => {
  setEnv({
    VERCEL: undefined,
    VERCEL_URL: undefined,
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
    BETTER_AUTH_URL: undefined,
    NODE_ENV: 'test',
  })

  expect(passkeysEnabledForHost('localhost:3000')).toBe(true)
  expect(passkeysEnabledForHost('LOCALHOST')).toBe(true)
  expect(passkeysEnabledForHost('example.com')).toBe(false)
})

test('off Vercel, passkey RP falls back to localhost', () => {
  setEnv({
    VERCEL: undefined,
    VERCEL_ENV: undefined,
    VERCEL_URL: undefined,
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
    BETTER_AUTH_URL: undefined,
    NODE_ENV: 'test',
  })

  expect(passkeyRp()).toEqual({ rpID: 'localhost', origin: 'http://localhost:3000' })
})
