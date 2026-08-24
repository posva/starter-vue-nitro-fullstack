<script setup lang="ts">
import { onMounted, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useValidup } from '@validup/vue'
import { credentialsValidator, type AuthMode, type Credentials } from '#shared/validators/auth'
import { authClient } from '../lib/auth-client'
import { useAuth } from '../lib/use-auth'
import { SOCIAL, type SocialProvider } from '../lib/social-providers'
import { errorMessage } from '../lib/errors'
import { fieldError } from '../lib/form'
import { useSeoMeta } from '@unhead/vue'

const router = useRouter()
const { refresh } = useAuth()

useSeoMeta({
  title: 'Sign in',
  robots: 'noindex',
})

const mode = ref<AuthMode>('sign-in')

const form = reactive<Credentials>({ name: '', email: '', password: '' })
// The mode IS the container group: `name` is mounted into `sign-up` only, so
// flipping this ref changes which mounts run. No second schema to keep in sync.
const v = useValidup(credentialsValidator, form, { group: mode })
const pending = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
// Set after a sign-up that needs email verification (no session yet): holds the
// address so we can show a "check your email" panel and offer a resend, instead
// of navigating to /account (which would just bounce back here).
const awaitingEmail = ref<string | null>(null)

// Which providers actually have credentials configured on the server.
const configured = shallowRef<string[]>([])
// Optimistic: show the passkey button until the server says this host can't run
// a WebAuthn ceremony (true on production/localhost, false on preview aliases).
const passkeysEnabled = ref(true)
onMounted(async () => {
  try {
    const res = await fetch('/api/auth-providers')
    const data = await res.json()
    configured.value = data.providers ?? []
    passkeysEnabled.value = data.passkeys ?? true
  } catch {
    // best-effort; buttons still render, just flagged as not-configured
  }
})

function toggleMode() {
  mode.value = mode.value === 'sign-in' ? 'sign-up' : 'sign-in'
  error.value = notice.value = awaitingEmail.value = null
  // Errors from the mode you just left shouldn't greet you in the new one.
  v.$reset()
}

function backToSignIn() {
  mode.value = 'sign-in'
  error.value = notice.value = awaitingEmail.value = null
  v.$reset()
}

async function done() {
  await refresh()
  router.push('/account')
}

async function submitEmail() {
  // Runs the active group only, so `name` is required on sign-up and ignored
  // on sign-in — hence no `!` on `result.data.name` below.
  const result = await v.$validate()
  if (!result.success) return

  error.value = notice.value = awaitingEmail.value = null
  pending.value = true
  try {
    if (mode.value === 'sign-up') {
      const { data, error: e } = await authClient.signUp.email({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
        // Where the verification link lands once clicked.
        callbackURL: '/account',
      })
      if (e) throw new Error(e.message)
      // No session token means email verification is required before sign-in:
      // don't navigate (it would bounce back), show the "check your email" panel.
      if (!data?.token) {
        awaitingEmail.value = result.data.email
        return
      }
    } else {
      const { error: e } = await authClient.signIn.email({
        email: result.data.email,
        password: result.data.password,
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

async function resendVerification() {
  if (!awaitingEmail.value) return
  error.value = notice.value = null
  pending.value = true
  try {
    // Surfaces real provider failures now that the server no longer swallows them.
    const { error: e } = await authClient.sendVerificationEmail({
      email: awaitingEmail.value,
      callbackURL: '/account',
    })
    if (e) error.value = e.message ?? 'Could not resend the verification email'
    else notice.value = 'Verification link re-sent.'
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
  <div class="mx-auto max-w-sm py-4">
    <UCard>
      <template #header>
        <h1 class="text-xl font-semibold text-highlighted">
          {{
            awaitingEmail ? 'Verify your email' : mode === 'sign-in' ? 'Sign in' : 'Create account'
          }}
        </h1>
      </template>

      <div v-if="error || notice" class="mb-4 space-y-2">
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="error"
        />
        <UAlert
          v-if="notice"
          color="success"
          variant="subtle"
          icon="i-lucide-mail-check"
          :description="notice"
        />
      </div>

      <template v-if="awaitingEmail">
        <p class="text-sm text-muted">
          Almost there — if
          <span class="font-medium text-highlighted">{{ awaitingEmail }}</span>
          is a new address, a verification link is on its way. Click it to finish signing in.
        </p>
        <div class="mt-4 space-y-2">
          <UButton
            block
            icon="i-lucide-mail"
            label="Resend verification email"
            :loading="pending"
            @click="resendVerification"
          />
          <UButton
            block
            variant="subtle"
            color="neutral"
            label="Back to sign in"
            :disabled="pending"
            @click="backToSignIn"
          />
        </div>
      </template>

      <template v-else>
        <div class="space-y-2">
          <UButton
            v-for="p in SOCIAL"
            :key="p.id"
            block
            color="neutral"
            variant="subtle"
            :icon="p.icon"
            :label="`Continue with ${p.label}`"
            :disabled="pending"
            :title="configured.includes(p.id) ? '' : 'Not configured yet — set its env vars'"
            @click="signInWithProvider(p.id)"
          >
            <template v-if="!configured.includes(p.id)" #trailing>
              <UBadge color="warning" variant="subtle" size="sm" label="setup" />
            </template>
          </UButton>
          <UButton
            v-if="passkeysEnabled"
            block
            color="neutral"
            variant="subtle"
            icon="i-lucide-key-round"
            label="Continue with a passkey"
            :disabled="pending"
            @click="signInWithPasskey"
          />
        </div>

        <USeparator label="or" class="my-4" />

        <form class="space-y-4" @submit.prevent="submitEmail">
          <UFormField
            v-show="mode === 'sign-up'"
            name="name"
            label="Name"
            required
            :error="fieldError(v.fields.name)"
          >
            <UInput
              id="name"
              v-model="v.fields.name.$model.value"
              autocomplete="name"
              class="w-full"
              @blur="v.fields.name.$touch()"
            />
          </UFormField>
          <UFormField name="email" label="Email" required :error="fieldError(v.fields.email)">
            <UInput
              id="email"
              v-model="v.fields.email.$model.value"
              type="email"
              autocomplete="username"
              class="w-full"
              @blur="v.fields.email.$touch()"
            />
          </UFormField>
          <UFormField
            name="password"
            label="Password"
            required
            :error="fieldError(v.fields.password)"
          >
            <template v-if="mode === 'sign-in'" #hint>
              <UButton
                variant="link"
                color="neutral"
                size="xs"
                label="Forgot password?"
                @click="forgotPassword"
              />
            </template>
            <UInput
              id="password"
              v-model="v.fields.password.$model.value"
              type="password"
              :autocomplete="mode === 'sign-up' ? 'new-password' : 'current-password'"
              class="w-full"
              @blur="v.fields.password.$touch()"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            :loading="pending"
            :label="mode === 'sign-in' ? 'Sign in' : 'Sign up'"
          />
        </form>
      </template>

      <template v-if="!awaitingEmail" #footer>
        <UButton
          variant="link"
          color="neutral"
          class="px-0"
          :label="mode === 'sign-in' ? 'Need an account? Sign up' : 'Have an account? Sign in'"
          @click="toggleMode"
        />
      </template>
    </UCard>
  </div>
</template>
