<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { RouterLink } from 'vue-router'
import { userListQuery } from '~/queries/users'

const { state, asyncStatus, refresh } = useQuery(userListQuery)
</script>

<template>
  <main>
    <div class="header">
      <h1>Users</h1>
      <RouterLink class="button" to="/users/new">New user</RouterLink>
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

      <button class="refresh" :disabled="asyncStatus === 'loading'" @click="() => refresh()">
        Refresh
      </button>
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
