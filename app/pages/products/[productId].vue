<script lang="ts" setup>
import { useQuery } from '@pinia/colada'
import { useRoute } from 'vue-router'
import { useSeoMeta } from '@unhead/vue'
import { productByIdQuery } from '~/queries/products'

const route = useRoute()

// Options getter: the key tracks the route param, so navigating between
// products swaps cache entries automatically.
const { state, asyncStatus } = useQuery(() => productByIdQuery(route.params.productId))

// Getters keep the tags in sync with the loaded product.
useSeoMeta({
  title: () => state.value.data?.name ?? `Product ${route.params.productId}`,
  description: () => state.value.data?.description ?? null,
  // og:* aren't derived from <title>; set them when the social preview should differ.
  ogTitle: () => (state.value.data ? `${state.value.data.name} · Vue + Nitro` : null),
  ogDescription: () => state.value.data?.description ?? null,
})

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <UPageHeader :title="state.data?.name ?? `Product ${route.params.productId}`">
      <template #headline>
        <UBadge color="neutral" variant="subtle" label="Demo route" />
      </template>
    </UPageHeader>

    <UAlert
      v-if="state.status === 'error'"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Could not load this product"
      :description="state.error?.message"
    />

    <UCard v-else>
      <div v-if="asyncStatus === 'loading' && !state.data" class="space-y-3">
        <USkeleton class="h-4 w-3/4" />
        <USkeleton class="h-4 w-1/2" />
      </div>

      <div v-else-if="state.data" class="space-y-4">
        <p>{{ state.data.description }}</p>
        <div class="flex items-center gap-3">
          <span class="text-highlighted text-2xl font-semibold">
            {{ currency.format(state.data.price) }}
          </span>
          <UBadge
            :color="state.data.inStock ? 'success' : 'neutral'"
            variant="subtle"
            :label="state.data.inStock ? 'In stock' : 'Out of stock'"
          />
        </div>
        <p class="text-muted text-sm">
          Fetched with mande + Pinia Colada — try another id:
          <ULink :to="`/products/${Number(route.params.productId) + 1}`">next product</ULink>
        </p>
      </div>
    </UCard>
  </div>
</template>
