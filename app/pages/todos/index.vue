<script lang="ts">
// Exporting the loader from the page registers it. `autoExportsDataLoaders`
// also does this, but not in the nitro SSR build, so keep the explicit export.
export { useTodoList } from '~/loaders/todos'
</script>

<script setup lang="ts">
import { reactive } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useSeoMeta } from '@unhead/vue'
import { useValidup } from '@validup/vue'
import type { NewTodoPayload, Todo } from '#shared/api/todos'
import { todoDraftValidator } from '#shared/validators/todos'
import { fieldError } from '~/lib/form'
import { useTodoList } from '~/loaders/todos'
import { useCreateTodo, useToggleTodo, isOptimisticTodo } from '~/mutations/todos'

useSeoMeta({
  title: 'Todos',
  description: 'Tasks stored in the database.',
})

const { state, asyncStatus, refresh } = useTodoList()
// Optimistic: the icon flips instantly, rolls back (with a toast) on failure.
const { mutate: toggleTodo } = useToggleTodo()

const newTodo = reactive<NewTodoPayload>({ title: '' })
// The same container `POST /api/todos` runs. A whitespace-only title used to
// pass here and get rejected by the server (400, then rollback + toast); now
// the shared rule catches it before the request goes out.
const v = useValidup(todoDraftValidator, newTodo)

const { mutateAsync: createTodo } = useCreateTodo()

async function onSubmit() {
  const result = await v.$validate()
  if (!result.success) return

  // Trimmed by the validator, so this is byte-for-byte what the server stores.
  const payload = result.data
  // Optimistic: clear right away, the todo is already in the list;
  // the mutation handles rollback + toast on failure.
  newTodo.title = ''
  v.$reset()
  try {
    await createTodo(payload)
  } catch {
    // Restore the draft so it can be resubmitted, unless a new one was typed.
    newTodo.title ||= payload.title
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

    <form @submit.prevent="onSubmit">
      <UFormField name="title" :error="fieldError(v.fields.title)">
        <div class="flex items-start gap-3">
          <UInput
            v-model="v.fields.title.$model.value"
            placeholder="What needs doing?"
            icon="i-lucide-plus"
            class="flex-1"
            @blur="v.fields.title.$touch()"
          />
          <UButton type="submit" label="Add" />
        </div>
      </UFormField>
    </form>

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
