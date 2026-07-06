<script setup lang="ts">
import UCard from '@nuxt/ui/components/Card.vue'
import UPageHeader from '@nuxt/ui/components/PageHeader.vue'
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <UPageHeader
      title="About"
      description="A simple Vue Router demo app built with Vite Plugin Fullstack."
    />

    <UCard>
      <p>This is a simple Vue Router demo app built with Vite Plugin Fullstack.</p>
      <p class="mt-2 text-muted">It demonstrates basic routing and server-side rendering.</p>
    </UCard>
  </div>
</template>
