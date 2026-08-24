<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useValidup } from '@validup/vue'
import { newPasswordValidator, type NewPassword } from '#shared/validators/auth'
import { authClient } from '../lib/auth-client'
import { errorMessage } from '../lib/errors'
import { fieldError } from '../lib/form'
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

// Same password rule the sign-up form mounts — stated once in shared/validators.
const state = reactive<NewPassword>({ password: '' })
const v = useValidup(newPasswordValidator, state)

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

async function submit() {
  const result = await v.$validate()
  if (!result.success) return

  error.value = null
  pending.value = true
  try {
    const { error: e } = await authClient.resetPassword({
      newPassword: result.data.password,
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
      <form v-else class="space-y-4" @submit.prevent="submit">
        <UFormField
          name="password"
          label="New password"
          required
          :error="fieldError(v.fields.password)"
        >
          <UInput
            id="new-password"
            v-model="v.fields.password.$model.value"
            type="password"
            autocomplete="new-password"
            class="w-full"
            @blur="v.fields.password.$touch()"
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
      </form>
    </UCard>
  </div>
</template>
