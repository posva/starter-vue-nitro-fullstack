import { test, expect, afterEach } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '../database/schema'
import { authOptions } from './auth'

// `authOptions` reads process.env at call time, so each case mutates the env and
// restores it afterwards. A dummy PGlite db is enough — building the options
// object never touches the database.
const db = drizzle(new PGlite(), { schema })

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
