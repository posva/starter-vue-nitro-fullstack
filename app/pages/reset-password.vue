<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { authClient } from '../lib/auth-client'
import { errorMessage } from '../lib/errors'
import { useSeoMeta } from '@unhead/vue'

useSeoMeta({
  title: 'Reset password',
  robots: 'noindex',
})

const route = useRoute()
const router = useRouter()

const token = computed(() => route.params.token)
const pending = ref(false)
const error = ref<string | null>(null)
const done = ref(false)

const schema = z.object({
  password: z.string().min(8, 'Min 8 characters'),
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ password: '' })

definePage({
  params: {
    query: {
      token: {
        default: '',
      },
    },
  },
})

onMounted(() => {
  // Better Auth appends ?token=… to the redirect URL it emailed.
  if (!token.value) error.value = 'Missing or invalid reset token.'
})

async function submit(event: FormSubmitEvent<Schema>) {
  error.value = null
  pending.value = true
  try {
    const { error: e } = await authClient.resetPassword({
      newPassword: event.data.password,
      token: token.value,
    })
    if (e) throw new Error(e.message)
    done.value = true
    setTimeout(() => router.push('/login'), 1500)
  } catch (e) {
    error.value = errorMessage(e, 'Could not reset password')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm py-4">
    <UCard>
      <template #header>
        <h1 class="text-xl font-semibold text-highlighted">Reset password</h1>
      </template>

      <UAlert
        v-if="done"
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        description="Password updated. Redirecting to sign in…"
      />
      <UForm v-else :schema="schema" :state="state" class="space-y-4" @submit="submit">
        <UFormField name="password" label="New password" required>
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
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

        <UButton
          type="submit"
          block
          label="Update password"
          :loading="pending"
          :disabled="!token"
        />
      </UForm>
    </UCard>
  </div>
</template>
