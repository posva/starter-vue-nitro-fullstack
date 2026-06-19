<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'

interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

const users = shallowRef<User[]>([])
const pending = ref(false)
const error = ref<string | null>(null)

async function load() {
  pending.value = true
  error.value = null
  try {
    const res = await fetch('/api/users')
    if (!res.ok) throw new Error(`Request failed with ${res.status}`)
    users.value = await res.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load users'
  } finally {
    pending.value = false
  }
}

onMounted(load)
</script>

<template>
  <main>
    <div class="header">
      <h1>Users</h1>
      <RouterLink class="button" to="/users/new">New user</RouterLink>
    </div>

    <div class="card">
      <p v-if="pending">Loading…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else-if="!users.length">No users yet. Create the first one!</p>

      <table v-else>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ new Date(user.createdAt).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>

      <button class="refresh" :disabled="pending" @click="load">Refresh</button>
    </div>
  </main>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.header h1 {
  color: var(--primary);
  margin: 0;
}

/* RouterLink styled as a primary button */
.button {
  text-decoration: none;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
}

th {
  color: var(--text-dim);
  font-weight: 600;
}

.refresh {
  margin-top: 1rem;
}
</style>
