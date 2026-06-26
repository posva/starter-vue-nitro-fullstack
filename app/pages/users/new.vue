<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'

const router = useRouter()

const name = ref('')
const email = ref('')
const pending = ref(false)
const error = ref<string | null>(null)

async function submit() {
  pending.value = true
  error.value = null
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name.value, email: email.value }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.message || `Request failed with ${res.status}`)
    }
    await router.push('/users')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create user'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main>
    <h1>New user</h1>

    <form class="card" @submit.prevent="submit">
      <label>
        <span>Name</span>
        <input v-model="name" type="text" required autocomplete="name" />
      </label>

      <label>
        <span>Email</span>
        <input v-model="email" type="email" required autocomplete="email" />
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <RouterLink to="/users">Cancel</RouterLink>
        <button type="submit" :disabled="pending">
          {{ pending ? 'Creating…' : 'Create user' }}
        </button>
      </div>
    </form>
  </main>
</template>

<style scoped>
/* Layout only — colours/inputs come from the global theme (styles.css). */
h1 {
  color: var(--primary);
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label span {
  font-weight: 600;
  color: var(--text);
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
}
</style>
