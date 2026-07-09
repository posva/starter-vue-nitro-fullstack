<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSeoMeta } from '@unhead/vue'

const route = useRoute()
const productId = computed(() => route.params.productId as string)

// Getters keep the tags in sync with the route (derive from loaded data in a real app).
useSeoMeta({
  title: () => `Product ${productId.value}`,
  description: () => `Details, pricing, and availability for product ${productId.value}.`,
  // og:* aren't derived from <title>; set them when the social preview should differ.
  ogTitle: () => `Product ${productId.value} · Vue + Nitro`,
  ogDescription: () => `Everything you need to know about product ${productId.value}.`,
})
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <UPageHeader :title="`Product ${route.params.productId}`">
      <template #headline>
        <UBadge color="neutral" variant="subtle" label="Demo route" />
      </template>
    </UPageHeader>

    <UCard>
      <p>This is a simple Vue Router demo app built with Vite Plugin Fullstack.</p>
      <p class="mt-2 text-muted">It demonstrates basic routing and server-side rendering.</p>
    </UCard>
  </div>
</template>
