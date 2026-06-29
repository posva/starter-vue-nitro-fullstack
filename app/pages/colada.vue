<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { users } from '#shared/api/users'

interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

// `useQuery` handles caching, deduplication, and SSR hydration for us.
// https://pinia-colada.esm.dev/guide/queries.html
const { state, asyncStatus, refetch } = useQuery({
  key: ['users'],
  query: () => users.get<User[]>('/'),
})
</script>

<template>
  <main>
    <div class="header">
      <h1>Users (Pinia Colada)</h1>
      <button class="refresh" :disabled="asyncStatus === 'loading'" @click="() => refetch()">
        {{ asyncStatus === 'loading' ? 'Refreshing…' : 'Refresh' }}
      </button>
    </div>

    <div class="card">
      <p v-if="state.status === 'pending'">Loading…</p>
      <p v-else-if="state.status === 'error'" class="error">{{ state.error?.message }}</p>
      <p v-else-if="!state.data?.length">No users yet. Create the first one!</p>

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
          <tr v-for="user in state.data" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.createdAt }}</td>
          </tr>
        </tbody>
      </table>
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
  color: #646cff;
  margin: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #eee;
}

th {
  color: #888;
  font-weight: 600;
}

.error {
  color: #d33;
}
</style>
