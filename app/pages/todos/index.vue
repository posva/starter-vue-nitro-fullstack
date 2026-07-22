<script setup lang="ts">
import { reactive } from 'vue'
import { useQuery } from '@pinia/colada'
import type { TableColumn } from '@nuxt/ui'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useSeoMeta } from '@unhead/vue'
import * as z from 'zod'
import type { Todo } from '#shared/api/todos'
import { todoListQuery } from '~/queries/todos'
import { useCreateTodo, useToggleTodo, isOptimisticTodo } from '~/mutations/todos'

useSeoMeta({
  title: 'Todos',
  description: 'Tasks stored in the database.',
})

const { state, asyncStatus, refresh } = useQuery(todoListQuery)
// Optimistic: the icon flips instantly, rolls back (with a toast) on failure.
const { mutate: toggleTodo } = useToggleTodo()

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
})
type Schema = z.output<typeof schema>

const newTodo = reactive<Partial<Schema>>({ title: '' })

const { mutateAsync: createTodo } = useCreateTodo()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  // Optimistic: clear right away, the todo is already in the list;
  // the mutation handles rollback + toast on failure.
  newTodo.title = ''
  try {
    await createTodo(event.data)
  } catch {
    // Restore the draft so it can be resubmitted, unless a new one was typed.
    newTodo.title ||= event.data.title
  }
}

const columns: TableColumn<Todo>[] = [
  { accessorKey: 'completed', header: 'Done' },
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'userId', header: 'Creator' },
  { accessorKey: 'createdAt', header: 'Created' },
]
</script>

<template>
  <div class="space-y-6">
    <UPageHeader title="Todos" description="Tasks stored in the database." />

    <UForm :schema="schema" :state="newTodo" @submit="onSubmit">
      <UFormField name="title">
        <div class="flex items-start gap-3">
          <UInput
            v-model="newTodo.title"
            placeholder="What needs doing?"
            icon="i-lucide-plus"
            class="flex-1"
          />
          <UButton type="submit" label="Add" />
        </div>
      </UFormField>
    </UForm>

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
          <!-- Pending optimistic row: not on the server yet, so no operations. -->
          <UButton
            v-if="isOptimisticTodo(row.original)"
            icon="i-lucide-loader-circle"
            color="neutral"
            variant="ghost"
            size="sm"
            disabled
            :ui="{ leadingIcon: 'animate-spin text-dimmed' }"
            aria-label="Saving todo"
          />
          <UButton
            v-else
            :icon="row.original.completed ? 'i-lucide-circle-check' : 'i-lucide-circle-dashed'"
            color="neutral"
            variant="ghost"
            size="sm"
            :ui="{ leadingIcon: row.original.completed ? 'text-success' : 'text-dimmed' }"
            :aria-label="row.original.completed ? 'Mark as not done' : 'Mark as done'"
            @click="toggleTodo(row.original)"
          />
        </template>

        <template #title-cell="{ row }">
          <span :class="{ 'text-dimmed italic': isOptimisticTodo(row.original) }">
            {{ row.original.title }}
          </span>
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
