<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useSeoMeta } from '@unhead/vue'
import { useCreateTodo } from '~/mutations/todos'

useSeoMeta({ title: 'New todo' })

const router = useRouter()

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ title: '' })

const { mutateAsync: createTodo, asyncStatus, error } = useCreateTodo()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await createTodo(event.data)
    await router.push('/todos')
  } catch {
    // `error` is exposed reactively by the mutation.
  }
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <UPageHeader title="New todo" />

    <UCard>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField name="title" label="Title" required>
          <UInput v-model="state.title" placeholder="What needs doing?" autofocus class="w-full" />
        </UFormField>

        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="error.message"
        />

        <div class="flex items-center justify-end gap-3">
          <UButton to="/todos" label="Cancel" color="neutral" variant="ghost" />
          <UButton type="submit" label="Create todo" :loading="asyncStatus === 'loading'" />
        </div>
      </UForm>
    </UCard>
  </div>
</template>
