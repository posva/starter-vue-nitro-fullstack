<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useCreateUser } from '~/mutations/users'

const router = useRouter()

const name = ref('')
const email = ref('')

const { mutateAsync: createUser, asyncStatus, error } = useCreateUser()

async function submit() {
  try {
    await createUser({ name: name.value, email: email.value })
    await router.push('/users')
  } catch {
    // `error` is exposed reactively by the mutation.
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

      <p v-if="error" class="error">{{ error.message }}</p>

      <div class="actions">
        <RouterLink to="/users">Cancel</RouterLink>
        <button type="submit" :disabled="asyncStatus === 'loading'">
          {{ asyncStatus === 'loading' ? 'Creating…' : 'Create user' }}
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
