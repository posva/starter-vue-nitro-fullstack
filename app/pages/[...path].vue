<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const path = computed(() => {
  const p = route.params.path
  return '/' + (Array.isArray(p) ? p.join('/') : (p ?? ''))
})
</script>

<template>
  <div class="mx-auto max-w-md py-12 text-center space-y-4">
    <p class="text-5xl font-bold text-primary">404</p>
    <h1 class="text-xl font-semibold text-highlighted">Page not found</h1>
    <p class="text-muted">No route matched <UKbd :value="path" /></p>
    <UButton to="/" icon="i-lucide-arrow-left" label="Back home" color="neutral" variant="subtle" />
  </div>
</template>
