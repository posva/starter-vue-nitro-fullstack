<script setup lang="ts">
import { onMounted, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { authClient } from '../lib/auth-client'
import { useAuth } from '../lib/use-auth'
import { SOCIAL, type SocialProvider } from '../lib/social-providers'
import { errorMessage } from '../lib/errors'

const router = useRouter()
const { refresh } = useAuth()

// TODO: split in two pages or components
// TODO: reuse pinia colada with mutations from account
type Mode = 'sign-in' | 'sign-up'
const mode = ref<Mode>('sign-in')

const form = reactive({ name: '', email: '', password: '' })
const pending = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

// Which providers actually have credentials configured on the server.
const configured = shallowRef<string[]>([])
onMounted(async () => {
  try {
    // TODO: use pinia colada
    const res = await fetch('/api/auth-providers')
    configured.value = (await res.json()).providers ?? []
  } catch {
    // best-effort; buttons still render, just flagged as not-configured
  }
})

async function done() {
  await refresh()
  router.push('/account')
}

async function submitEmail() {
  error.value = notice.value = null
  pending.value = true
  try {
    if (mode.value === 'sign-up') {
      const { error: e } = await authClient.signUp.email({
        name: form.name,
        email: form.email,
        password: form.password,
      })
      if (e) throw new Error(e.message)
    } else {
      const { error: e } = await authClient.signIn.email({
        email: form.email,
        password: form.password,
      })
      if (e) throw new Error(e.message)
    }
    await done()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    pending.value = false
  }
}

async function signInWithProvider(provider: SocialProvider) {
  error.value = notice.value = null
  // Full-page redirect into the OAuth flow; comes back to /account.
  const { error: e } = await authClient.signIn.social({
    provider,
    callbackURL: '/account',
  })
  if (e) error.value = e.message ?? `Could not sign in with ${provider}`
}

async function signInWithPasskey() {
  error.value = notice.value = null
  pending.value = true
  try {
    const res = await authClient.signIn.passkey()
    if (res?.error) throw new Error(res.error.message)
    await done()
  } catch (e) {
    error.value = errorMessage(e, 'Passkey sign-in failed')
  } finally {
    pending.value = false
  }
}

async function forgotPassword() {
  error.value = notice.value = null
  if (!form.email) {
    error.value = 'Enter your email first, then click “Forgot password”.'
    return
  }
  const { error: e } = await authClient.requestPasswordReset({
    email: form.email,
    redirectTo: `${location.origin}/reset-password`,
  })
  if (e) error.value = e.message ?? 'Could not send reset email'
  else notice.value = 'If that email exists, a reset link is on its way.'
}
</script>

<template>
  <main>
    <div class="card">
      <h1>{{ mode === 'sign-in' ? 'Sign in' : 'Create account' }}</h1>

      <div class="social">
        <button
          v-for="p in SOCIAL"
          :key="p.id"
          class="btn-neutral"
          type="button"
          :disabled="pending"
          :title="configured.includes(p.id) ? '' : 'Not configured yet — set its env vars'"
          @click="signInWithProvider(p.id)"
        >
          Continue with {{ p.label }}
          <span v-if="!configured.includes(p.id)" class="badge">setup</span>
        </button>
        <button class="btn-neutral" type="button" :disabled="pending" @click="signInWithPasskey">
          Continue with a passkey
        </button>
      </div>

      <div class="divider">or</div>

      <form @submit.prevent="submitEmail">
        <label v-if="mode === 'sign-up'">
          Name
          <input v-model="form.name" type="text" autocomplete="name" required />
        </label>
        <label>
          Email
          <input v-model="form.email" type="email" autocomplete="email" required />
        </label>
        <label>
          Password
          <input
            v-model="form.password"
            type="password"
            :autocomplete="mode === 'sign-up' ? 'new-password' : 'current-password'"
            required
            minlength="8"
          />
        </label>

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="notice" class="notice">{{ notice }}</p>

        <button class="button" type="submit" :disabled="pending">
          {{ pending ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Sign up' }}
        </button>
      </form>

      <div class="meta">
        <button v-if="mode === 'sign-in'" class="link" type="button" @click="forgotPassword">
          Forgot password?
        </button>
        <button
          class="link"
          type="button"
          @click="mode = mode === 'sign-in' ? 'sign-up' : 'sign-in'"
        >
          {{ mode === 'sign-in' ? 'Need an account? Sign up' : 'Have an account? Sign in' }}
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Layout only — colours/components come from the global theme (main.css). */
main {
  max-width: 420px;
  margin: 2rem auto;
}

h1 {
  margin-bottom: 1.25rem;
}

.social,
form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.meta {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
}
</style>
