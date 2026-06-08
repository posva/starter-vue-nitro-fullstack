<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authClient } from '../lib/auth-client'

const route = useRoute()
const router = useRouter()

const token = ref('')
const password = ref('')
const pending = ref(false)
const error = ref<string | null>(null)
const done = ref(false)

onMounted(() => {
  // Better Auth appends ?token=… to the redirect URL it emailed.
  token.value = String(route.query.token ?? '')
  if (!token.value) error.value = 'Missing or invalid reset token.'
})

async function submit() {
  error.value = null
  pending.value = true
  try {
    const { error: e } = await authClient.resetPassword({
      newPassword: password.value,
      token: token.value,
    })
    if (e) throw new Error(e.message)
    done.value = true
    setTimeout(() => router.push('/login'), 1500)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not reset password'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main>
    <div class="card">
      <h1>Reset password</h1>
      <p v-if="done" class="notice">Password updated. Redirecting to sign in…</p>
      <form v-else @submit.prevent="submit">
        <label>
          New password
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            required
            minlength="8"
          />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="button" type="submit" :disabled="pending || !token">
          {{ pending ? 'Updating…' : 'Update password' }}
        </button>
      </form>
    </div>
  </main>
</template>

<style scoped>
main {
  max-width: 420px;
  margin: 2rem auto;
}

.card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

h1 {
  color: #646cff;
  margin: 0 0 1rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: #555;
}

input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.button {
  background: #646cff;
  color: white;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.button:disabled {
  opacity: 0.6;
}

.error {
  color: #d33;
  margin: 0;
}

.notice {
  color: #2a7;
}
</style>
