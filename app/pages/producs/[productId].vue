<script lang="ts" setup>
import { useRoute } from 'vue-router'

const route = useRoute()
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
