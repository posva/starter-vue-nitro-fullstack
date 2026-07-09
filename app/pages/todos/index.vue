<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import type { TableColumn } from '@nuxt/ui'
import { useSeoMeta } from '@unhead/vue'
import { todoListQuery, type Todo } from '~/queries/todos'

useSeoMeta({
  title: 'Todos',
  description: 'Tasks stored in the database.',
})

const { state, asyncStatus, refresh } = useQuery(todoListQuery)

const columns: TableColumn<Todo>[] = [
  { accessorKey: 'completed', header: 'Done' },
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'userId', header: 'Creator' },
  { accessorKey: 'createdAt', header: 'Created' },
]
</script>

<template>
  <div class="space-y-6">
    <UPageHeader title="Todos" description="Tasks stored in the database.">
      <template #links>
        <UButton to="/todos/new" icon="i-lucide-plus" label="New todo" />
      </template>
    </UPageHeader>

    <UAlert
      v-if="state.status === 'error'"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Could not load todos"
      :description="state.error?.message"
    />

    <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="state.data ?? []" :columns="columns" :loading="asyncStatus === 'loading'">
        <template #completed-cell="{ row }">
          <UIcon
            v-if="row.original.completed"
            name="i-lucide-circle-check"
            class="size-5 text-success"
          />
          <UIcon v-else name="i-lucide-circle-dashed" class="size-5 text-dimmed" />
        </template>

        <template #userId-cell="{ row }">
          <UBadge
            :color="row.original.userId ? 'primary' : 'neutral'"
            variant="subtle"
            :label="row.original.userId ? 'User' : 'Anonymous'"
          />
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-muted">{{ new Date(row.original.createdAt).toLocaleString() }}</span>
        </template>

        <template #empty>
          <div class="py-6 text-center text-muted">No todos yet. Create the first one!</div>
        </template>
      </UTable>
    </UCard>

    <div class="flex justify-end">
      <UButton
        icon="i-lucide-refresh-cw"
        label="Refresh"
        color="neutral"
        variant="subtle"
        :loading="asyncStatus === 'loading'"
        @click="() => refresh()"
      />
    </div>
  </div>
</template>
