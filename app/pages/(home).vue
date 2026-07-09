<script setup lang="ts">
import { ref } from 'vue'
import { useSeoMeta } from '@unhead/vue'

// Brand-only title on the landing page.
useSeoMeta({
  title: 'Vue + Nitro',
  titleTemplate: null,
  description:
    'A fullstack Vue starter with Vite SSR, a Nitro server, authentication, and a typed data layer.',
})

const count = ref(0)

function increment() {
  count.value++
}
</script>

<template>
  <div class="space-y-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-highlighted">Vue Router Custom Framework</h1>
      <p class="mt-2 text-lg text-muted">A simple demo app with Vite + Nitro + Nuxt UI</p>
    </div>

    <UCard class="mx-auto max-w-sm text-center">
      <p class="text-2xl font-bold tabular-nums">Count: {{ count }}</p>
      <template #footer>
        <UButton icon="i-lucide-plus" label="Increment" block @click="increment" />
      </template>
    </UCard>
  </div>
</template>
