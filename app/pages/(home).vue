<script setup lang="ts">
import UButton from '@nuxt/ui/components/Button.vue'
import UCard from '@nuxt/ui/components/Card.vue'
import { ref } from 'vue'

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
