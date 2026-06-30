<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)

function increment() {
  count.value++
}
</script>

<template>
  <main>
    <section class="flex flex-col items-center py-10 text-center sm:py-16">
      <span
        class="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-text-dim backdrop-blur"
      >
        <span class="size-1.5 rounded-full bg-success" />
        Vue + Nitro · themeable with Tailwind v4
      </span>

      <h1 class="max-w-3xl bg-linear-to-br from-text to-primary bg-clip-text text-transparent">
        A starter that looks exquisite in any light
      </h1>
      <p class="subtitle max-w-xl">
        One set of CSS variables, oklch colors, light&nbsp;/&nbsp;dark and a live accent — re-themed
        at runtime, zero component library.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <RouterLink to="/todos" class="button">Browse todos</RouterLink>
        <RouterLink to="/about" class="button ghost">Learn more</RouterLink>
      </div>
    </section>

    <div class="grid gap-5 sm:grid-cols-3">
      <div class="card">
        <div
          class="mb-3 flex size-9 items-center justify-center rounded-lg bg-accent-soft text-primary"
        >
          <svg
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="13.5" cy="6.5" r="2.5" />
            <circle cx="19" cy="13" r="2.5" />
            <circle cx="6" cy="12" r="3" />
            <path d="M11 6.5H7m1 5.5 4.5 4" />
          </svg>
        </div>
        <h3 class="mb-1 text-base">Runtime accent</h3>
        <p class="muted">Pick a swatch in the nav — every surface re-tints instantly.</p>
      </div>

      <div class="card">
        <div
          class="mb-3 flex size-9 items-center justify-center rounded-lg bg-accent-soft text-primary"
        >
          <svg
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3a9 9 0 1 0 9 9h-9Z" />
          </svg>
        </div>
        <h3 class="mb-1 text-base">Light & dark</h3>
        <p class="muted">No-flash on SSR; follows your system or your choice.</p>
      </div>

      <div class="card flex flex-col items-start">
        <h3 class="mb-1 text-base">Counter</h3>
        <p class="muted mb-4">A little reactivity, nicely dressed.</p>
        <div class="mt-auto flex w-full items-center justify-between gap-4">
          <span class="text-3xl font-bold tabular-nums text-primary">{{ count }}</span>
          <button @click="increment">Increment</button>
        </div>
      </div>
    </div>
  </main>
</template>
