<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useCreateTodo } from '~/mutations/todos'

const router = useRouter()

const title = ref('')

const { mutateAsync: createTodo, asyncStatus, error } = useCreateTodo()

async function submit() {
  try {
    await createTodo({ title: title.value })
    await router.push('/todos')
  } catch {
    // `error` is exposed reactively by the mutation.
  }
}
</script>

<template>
  <main>
    <h1>New todo</h1>

    <form class="card" @submit.prevent="submit">
      <label>
        <span>Title</span>
        <input v-model="title" type="text" required />
      </label>

      <p v-if="error" class="error">{{ error.message }}</p>

      <div class="actions">
        <RouterLink to="/todos">Cancel</RouterLink>
        <button type="submit" :disabled="asyncStatus === 'loading'">
          {{ asyncStatus === 'loading' ? 'Creating…' : 'Create todo' }}
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
