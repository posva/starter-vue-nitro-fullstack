<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authClient } from '../lib/auth-client'
import { useAuth } from '../lib/use-auth'
import { SOCIAL, type SocialProvider } from '../lib/social-providers'
import { errorMessage } from '../lib/errors'
import { useSeoMeta } from '@unhead/vue'

const router = useRouter()
const { refresh } = useAuth()

useSeoMeta({
  title: 'Sign in',
  robots: 'noindex',
})

type Mode = 'sign-in' | 'sign-up'
const mode = ref<Mode>('sign-in')

// Schema depends on the mode: name is only collected (and required) on sign-up.
const schema = computed(() =>
  mode.value === 'sign-up'
    ? z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.email('Invalid email'),
        password: z.string().min(8, 'Min 8 characters'),
      })
    : z.object({
        email: z.email('Invalid email'),
        password: z.string().min(8, 'Min 8 characters'),
      }),
)

const form = reactive({ name: '', email: '', password: '' })
const pending = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

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
  error.value = notice.value = null
}

async function done() {
  await refresh()
  router.push('/account')
}

async function submitEmail(
  event: FormSubmitEvent<{ name?: string; email: string; password: string }>,
) {
  error.value = notice.value = null
  pending.value = true
  try {
    if (mode.value === 'sign-up') {
      const { error: e } = await authClient.signUp.email({
        name: event.data.name!,
        email: event.data.email,
        password: event.data.password,
      })
      if (e) throw new Error(e.message)
    } else {
      const { error: e } = await authClient.signIn.email({
        email: event.data.email,
        password: event.data.password,
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
  <div class="mx-auto max-w-sm py-4">
    <UCard>
      <template #header>
        <h1 class="text-xl font-semibold text-highlighted">
          {{ mode === 'sign-in' ? 'Sign in' : 'Create account' }}
        </h1>
      </template>

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

      <UForm :schema="schema" :state="form" class="space-y-4" @submit="submitEmail">
        <UFormField v-if="mode === 'sign-up'" name="name" label="Name" required>
          <UInput v-model="form.name" autocomplete="name" class="w-full" />
        </UFormField>
        <UFormField name="email" label="Email" required>
          <UInput v-model="form.email" type="email" autocomplete="email" class="w-full" />
        </UFormField>
        <UFormField name="password" label="Password" required>
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
            v-model="form.password"
            type="password"
            :autocomplete="mode === 'sign-up' ? 'new-password' : 'current-password'"
            class="w-full"
          />
        </UFormField>

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

        <UButton
          type="submit"
          block
          :loading="pending"
          :label="mode === 'sign-in' ? 'Sign in' : 'Sign up'"
        />
      </UForm>

      <template #footer>
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
