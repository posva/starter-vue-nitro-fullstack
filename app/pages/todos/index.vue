<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { RouterLink } from 'vue-router'
import { todoListQuery } from '~/queries/todos'

const { state, asyncStatus, refresh } = useQuery(todoListQuery)
</script>

<template>
  <main>
    <div class="header">
      <h1>Todos</h1>
      <RouterLink class="button" to="/todos/new">New todo</RouterLink>
    </div>

    <div class="card">
      <p v-if="state.status === 'pending'">Loading…</p>
      <p v-else-if="state.status === 'error'" class="error">{{ state.error?.message }}</p>
      <p v-else-if="!state.data?.length">No todos yet. Create the first one!</p>

      <table v-else>
        <thead>
          <tr>
            <th>Done</th>
            <th>Title</th>
            <th>Creator</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="todo in state.data" :key="todo.id">
            <td>{{ todo.completed ? '✅' : '⬜️' }}</td>
            <td>{{ todo.title }}</td>
            <td>{{ todo.userId ? 'User' : 'Anonymous' }}</td>
            <td>{{ todo.createdAt }}</td>
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
